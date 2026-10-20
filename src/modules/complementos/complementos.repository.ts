import { Injectable } from '@nestjs/common';
import {
  Cara,
  EstadoNodo,
  Nodo,
  Prisma,
  TipoConexion,
  TipoNodo,
} from '@prisma/client';
import { ORIGEN_RITUAL } from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Ritual } from '../area/area.types.js';

type Tx = Prisma.TransactionClient;

export interface NuevoComplemento {
  readonly padreId: string;
  /** La cara de su dueño. */
  readonly cara: Cara;
  readonly prioridad: number | null;
  /** A quién espera: queda ESPERA_RESPUESTA_DE en el mismo commit. */
  readonly personaId: string | null;
  readonly tipo: TipoNodo;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly etiqueta: string;
  /** Una duda frena a su PBI: el padre queda BLOQUEADA_POR ella. */
  readonly frenaAlPadre: boolean;
  /** «Para decir»: el complemento queda EN_DAILY_DE este ritual. */
  readonly ritual: Ritual | null;
}

export interface Espera {
  readonly conexionId: string;
  readonly persona: string;
}

export interface NuevaDecision {
  readonly titulo: string;
  readonly descripcion: string;
  readonly etiqueta: string;
}

const conectar = (
  tx: Tx,
  origenId: string,
  destinoId: string,
  tipo: TipoConexion,
) => tx.conexion.create({ data: { origenId, destinoId, tipo } });

@Injectable()
export class ComplementosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(id: string): Promise<Nodo | null> {
    return this.prisma.nodo.findUnique({ where: { id } });
  }

  /** El nodo y sus conexiones en un solo commit: un complemento sin padre no queda nunca. */
  async crear(nuevo: NuevoComplemento): Promise<Nodo> {
    const {
      padreId,
      cara,
      prioridad,
      personaId,
      tipo,
      titulo,
      descripcion,
      etiqueta,
      frenaAlPadre,
      ritual,
    } = nuevo;
    return this.prisma.$transaction(async (tx) => {
      const nodo = await tx.nodo.create({
        data: {
          tipo,
          titulo,
          descripcion,
          cara,
          prioridad,
          etiquetas: [etiqueta],
        },
      });
      await conectar(tx, nodo.id, padreId, TipoConexion.PERTENECE_A);
      if (frenaAlPadre) {
        await conectar(tx, padreId, nodo.id, TipoConexion.BLOQUEADA_POR);
      }
      if (personaId) {
        await conectar(
          tx,
          nodo.id,
          personaId,
          TipoConexion.ESPERA_RESPUESTA_DE,
        );
      }
      if (ritual) {
        const delRitual = await this.nodoDeRitual(tx, ritual);
        await conectar(tx, nodo.id, delRitual.id, TipoConexion.EN_DAILY_DE);
      }
      return nodo;
    });
  }

  /** Los nodos que PERTENECEN_A el padre y llevan alguna etiqueta de complemento. */
  async deUnNodo(
    padreId: string,
    etiquetas: readonly string[],
  ): Promise<Nodo[]> {
    return this.prisma.nodo.findMany({
      where: {
        etiquetas: { hasSome: [...etiquetas] },
        salientes: {
          some: { tipo: TipoConexion.PERTENECE_A, destinoId: padreId },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** A quién espera hoy la duda (su ESPERA_RESPUESTA_DE a una PERSONA), si a alguien. */
  async esperaDe(dudaId: string): Promise<Espera | null> {
    const conexion = await this.prisma.conexion.findFirst({
      where: {
        origenId: dudaId,
        tipo: TipoConexion.ESPERA_RESPUESTA_DE,
        destino: { tipo: TipoNodo.PERSONA },
      },
      select: { id: true, destino: { select: { titulo: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return conexion
      ? { conexionId: conexion.id, persona: conexion.destino.titulo }
      : null;
  }

  /** La duda pasa a esperar a `persona` (se crea si no existe) y suma la línea al rastro de su descripción. */
  async escalar(
    duda: Nodo,
    persona: string,
    anterior: Espera | null,
    rastro: string,
  ): Promise<Nodo> {
    return this.prisma.$transaction(async (tx) => {
      if (anterior) {
        await tx.conexion.delete({ where: { id: anterior.conexionId } });
      }
      const existente = await tx.nodo.findFirst({
        where: { tipo: TipoNodo.PERSONA, titulo: persona },
        orderBy: { createdAt: 'asc' },
      });
      const nodoPersona =
        existente ??
        (await tx.nodo.create({
          data: { tipo: TipoNodo.PERSONA, titulo: persona },
        }));
      await conectar(
        tx,
        duda.id,
        nodoPersona.id,
        TipoConexion.ESPERA_RESPUESTA_DE,
      );
      const descripcion = [duda.descripcion, rastro]
        .filter((parte) => parte)
        .join('\n');
      return tx.nodo.update({ where: { id: duda.id }, data: { descripcion } });
    });
  }

  /** Cierra la duda y deja la decisión colgada de ella y de lo mismo que colgaba la duda. */
  async decidir(duda: Nodo, decision: NuevaDecision): Promise<Nodo> {
    return this.prisma.$transaction(async (tx) => {
      const padres = await tx.conexion.findMany({
        where: { origenId: duda.id, tipo: TipoConexion.PERTENECE_A },
        select: { destinoId: true },
      });
      await tx.nodo.update({
        where: { id: duda.id },
        data: { estado: EstadoNodo.CERRADO },
      });
      const nodo = await tx.nodo.create({
        data: {
          tipo: TipoNodo.TAREA,
          titulo: decision.titulo,
          descripcion: decision.descripcion,
          etiquetas: [decision.etiqueta],
        },
      });
      const destinos = [duda.id, ...padres.map(({ destinoId }) => destinoId)];
      for (const destinoId of destinos) {
        await conectar(tx, nodo.id, destinoId, TipoConexion.PERTENECE_A);
      }
      return nodo;
    });
  }

  private async nodoDeRitual(tx: Tx, { clave, nombre }: Ritual): Promise<Nodo> {
    const existente = await tx.nodo.findUnique({
      where: {
        externoOrigen_externoId: {
          externoOrigen: ORIGEN_RITUAL,
          externoId: clave,
        },
      },
    });
    return (
      existente ??
      tx.nodo.create({
        data: {
          tipo: TipoNodo.DAILY_ITEM,
          titulo: nombre,
          externoOrigen: ORIGEN_RITUAL,
          externoId: clave,
        },
      })
    );
  }
}
