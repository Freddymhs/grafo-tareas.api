import { Injectable } from '@nestjs/common';
import { Nodo } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { aplicarPlan } from '../../importadores/aplicar-plan.js';
import type { Tx } from '../../importadores/aplicar-plan.js';
import type { ConexionPlan, NodoPlan } from '../../importadores/plan.js';

/** El carril que ya trajo un importador se reusa con su origen: si no, la misma columna del plan saldría dos veces. */
async function conOrigenExistente(tx: Tx, nodo: NodoPlan): Promise<NodoPlan> {
  if (nodo.origen) return nodo;
  const existente = await tx.nodo.findFirst({
    where: { externoId: nodo.externoId },
    select: { externoOrigen: true },
  });
  return existente?.externoOrigen
    ? { ...nodo, origen: existente.externoOrigen }
    : nodo;
}

@Injectable()
export class PiezasRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** La pieza, su HU y su carril, en una transacción: queda entera o no queda. */
  guardar(
    origen: string,
    pieza: NodoPlan,
    alrededor: readonly NodoPlan[],
    conexiones: readonly ConexionPlan[],
    proyectoId: string,
  ): Promise<Nodo> {
    return this.prisma.$transaction(async (tx) => {
      const conOrigen = await Promise.all(
        alrededor.map((nodo) => conOrigenExistente(tx, nodo)),
      );
      await aplicarPlan(
        tx,
        origen,
        [pieza, ...conOrigen],
        conexiones,
        proyectoId,
      );
      return tx.nodo.findUniqueOrThrow({
        where: {
          externoOrigen_externoId: {
            externoOrigen: origen,
            externoId: pieza.externoId,
          },
        },
      });
    });
  }
}
