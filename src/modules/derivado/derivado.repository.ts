import { Injectable } from '@nestjs/common';
import { EstadoNodo, Prisma } from '@prisma/client';
import {
  CONEXIONES_BLOQUEANTES,
  TIPOS_ACCIONABLES,
} from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';

const RESUMEN = {
  id: true,
  tipo: true,
  titulo: true,
  estado: true,
  color: true,
} as const satisfies Prisma.NodoSelect;

export type NodoResumen = Prisma.NodoGetPayload<{ select: typeof RESUMEN }>;

export interface Bloqueo {
  readonly origenId: string;
  readonly destinoId: string;
}

/** Una conexión bloqueante hacia un nodo que sigue ABIERTO: es lo que hace "bloqueado" a su origen (C1). */
const BLOQUEA_AHORA = {
  tipo: { in: [...CONEXIONES_BLOQUEANTES] },
  destino: { estado: EstadoNodo.ABIERTO },
} as const satisfies Prisma.ConexionWhereInput;

@Injectable()
export class DerivadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existe(id: string): Promise<boolean> {
    const total = await this.prisma.nodo.count({ where: { id } });
    return total > 0;
  }

  async bloqueadoresDe(nodoId: string): Promise<NodoResumen[]> {
    const conexiones = await this.prisma.conexion.findMany({
      where: { origenId: nodoId, ...BLOQUEA_AHORA },
      select: { destino: { select: RESUMEN } },
      orderBy: { createdAt: 'asc' },
    });
    return conexiones.map(({ destino }) => destino);
  }

  /** `notas`: las etiquetas de los complementos que no se hacen (un apunte, una decisión). */
  async hoyPuedo(notas: readonly string[]): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: {
        tipo: { in: [...TIPOS_ACCIONABLES] },
        estado: EstadoNodo.ABIERTO,
        salientes: { none: BLOQUEA_AHORA },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: RESUMEN,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Todo lo que espera a `nodoId`, directa o indirectamente. `UNION` (no `UNION ALL`) descarta lo ya visto:
   * por eso la recursión termina aunque haya ciclos.
   */
  async aguasAbajo(nodoId: string): Promise<string[]> {
    const tipos = [...CONEXIONES_BLOQUEANTES];
    const filas = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE abajo(id) AS (
        SELECT c.origen_id FROM conexiones c
        WHERE c.destino_id = ${nodoId} AND c.tipo::text = ANY(${tipos})
        UNION
        SELECT c.origen_id FROM conexiones c
        JOIN abajo a ON c.destino_id = a.id
        WHERE c.tipo::text = ANY(${tipos})
      )
      SELECT id FROM abajo
    `;
    return filas.map(({ id }) => id);
  }

  /** Los bloqueos vigentes de un conjunto de nodos ABIERTOS. */
  async bloqueosDe(ids: readonly string[]): Promise<Bloqueo[]> {
    return this.prisma.conexion.findMany({
      where: {
        origenId: { in: [...ids] },
        origen: { estado: EstadoNodo.ABIERTO },
        ...BLOQUEA_AHORA,
      },
      select: { origenId: true, destinoId: true },
    });
  }

  async resumenes(ids: readonly string[]): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: { id: { in: [...ids] } },
      select: RESUMEN,
    });
  }
}
