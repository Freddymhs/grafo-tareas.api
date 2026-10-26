import { Injectable } from '@nestjs/common';
import { EstadoNodo, Prisma, TipoConexion, TipoNodo } from '@prisma/client';
import {
  CONEXIONES_BLOQUEANTES,
  ETIQUETA_CARRIL,
  ETAPA_MERGEADA,
  ETIQUETA_MERGEADA,
  ORIGEN_RITUAL,
  TIPOS_ACCIONABLES,
  TIPOS_DEL_DIA,
} from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';

/** Los campos de `NodoResumenDto`, todos: el contrato declaraba etapa, etiquetas, prioridad y vence y no llegaban. */
const RESUMEN = {
  id: true,
  tipo: true,
  titulo: true,
  estado: true,
  cara: true,
  color: true,
  etapa: true,
  etiquetas: true,
  prioridad: true,
  vence: true,
} as const satisfies Prisma.NodoSelect;

export type NodoResumen = Prisma.NodoGetPayload<{ select: typeof RESUMEN }>;

export interface Bloqueo {
  readonly origenId: string;
  readonly destinoId: string;
}

/**
 * Una conexión bloqueante hacia un nodo que sigue ABIERTO: es lo que hace "bloqueado" a su origen (C1). Menos depender de
 * algo ya mergeado, que está cumplido: es `dependenciaCumplida` escrita para Prisma. «Sin columna» (`etapa` NULL) se pide
 * explícito: un `NOT (etapa = 'APROBADO')` da NULL en SQL y descartaba toda dependencia hacia una tarjeta sin columna.
 */
const BLOQUEA_AHORA = {
  tipo: { in: [...CONEXIONES_BLOQUEANTES] },
  destino: { estado: EstadoNodo.ABIERTO },
  OR: [
    { tipo: { not: TipoConexion.DEPENDE_DE } },
    {
      destino: {
        NOT: { etiquetas: { has: ETIQUETA_MERGEADA } },
        OR: [{ etapa: null }, { etapa: { not: ETAPA_MERGEADA } }],
      },
    },
  ],
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

  /** Tareas y FASE cerradas desde `desde`, sin las notas (`updatedAt` es honesto: los importadores solo escriben lo que cambia). */
  async terminadas(
    desde: Date,
    notas: readonly string[],
  ): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: {
        tipo: { in: [...TIPOS_DEL_DIA] },
        estado: EstadoNodo.CERRADO,
        updatedAt: { gte: desde },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: RESUMEN,
      orderBy: { updatedAt: 'asc' },
    });
  }

  /** Tareas y FASE abiertas en una de esas columnas, con si algo las frena ahora. */
  async enColumnas(columnas: readonly string[], notas: readonly string[]) {
    const nodos = await this.prisma.nodo.findMany({
      where: {
        tipo: { in: [...TIPOS_DEL_DIA] },
        estado: EstadoNodo.ABIERTO,
        etapa: { in: [...columnas] },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: {
        ...RESUMEN,
        salientes: { where: BLOQUEA_AHORA, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });
    return nodos.map(({ salientes, ...nodo }) => ({
      nodo,
      etapa: nodo.etapa ?? '',
      bloqueado: salientes.length > 0,
    }));
  }

  /** Tareas y FASE abiertas en el tablero (con etapa) que algo frena, y qué. */
  async detenidas(notas: readonly string[]) {
    const nodos = await this.prisma.nodo.findMany({
      where: {
        tipo: { in: [...TIPOS_DEL_DIA] },
        estado: EstadoNodo.ABIERTO,
        etapa: { not: null },
        salientes: { some: BLOQUEA_AHORA },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: {
        ...RESUMEN,
        salientes: {
          where: BLOQUEA_AHORA,
          select: { destino: { select: RESUMEN } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return nodos.map(({ salientes, ...nodo }) => ({
      nodo,
      por: salientes.map(({ destino }) => destino),
    }));
  }

  /** Los nodos abiertos con esa etiqueta (los trámites de cierre: `complemento:tramite`). */
  async abiertosConEtiqueta(etiqueta: string): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: { estado: EstadoNodo.ABIERTO, etiquetas: { has: etiqueta } },
      select: RESUMEN,
      orderBy: { titulo: 'asc' },
    });
  }

  /** Los «para decir» abiertos que cuelgan de un ritual, con el nombre del ritual. */
  async paraDecir() {
    const items = await this.prisma.nodo.findMany({
      where: {
        tipo: TipoNodo.DAILY_ITEM,
        estado: EstadoNodo.ABIERTO,
        salientes: {
          some: {
            tipo: TipoConexion.EN_DAILY_DE,
            destino: { externoOrigen: ORIGEN_RITUAL },
          },
        },
      },
      select: {
        ...RESUMEN,
        salientes: {
          where: {
            tipo: TipoConexion.EN_DAILY_DE,
            destino: { externoOrigen: ORIGEN_RITUAL },
          },
          select: { destino: { select: { titulo: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return items.map(({ salientes, ...nodo }) => ({
      nodo,
      ritual: salientes[0]?.destino.titulo ?? '',
    }));
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

  /** El grafo entero, en lo justo para armar las páginas (FASE 15): cada nodo y cada conexión, sin descripciones. */
  async paraPaginas() {
    const [nodos, conexiones] = await Promise.all([
      this.prisma.nodo.findMany({
        select: {
          id: true,
          tipo: true,
          titulo: true,
          estado: true,
          cara: true,
          etiquetas: true,
          etapa: true,
        },
      }),
      this.prisma.conexion.findMany({
        select: { origenId: true, destinoId: true, tipo: true },
      }),
    ]);
    return { nodos, conexiones };
  }

  /**
   * Lo que arma el tablero del plan (FASE 17): los nodos de las páginas pedidas más los carriles (RAMA con la etiqueta
   * `carril`, que no entran a ninguna página) y las pertenencias que salen de esos nodos.
   */
  async paraTableroPlan(ids: readonly string[]) {
    const [nodos, conexiones] = await Promise.all([
      this.prisma.nodo.findMany({
        where: {
          OR: [
            { id: { in: [...ids] } },
            { tipo: TipoNodo.RAMA, etiquetas: { has: ETIQUETA_CARRIL } },
          ],
        },
        select: RESUMEN,
      }),
      this.prisma.conexion.findMany({
        where: {
          origenId: { in: [...ids] },
          tipo: { in: [TipoConexion.PERTENECE_A, TipoConexion.DEPENDE_DE] },
        },
        select: { origenId: true, destinoId: true, tipo: true },
      }),
    ]);
    return { nodos, conexiones };
  }

  /** Todas las conexiones, en lo justo para recorrer el árbol (la familia de un nodo, FASE 15). */
  async enlaces() {
    return this.prisma.conexion.findMany({
      select: { origenId: true, destinoId: true, tipo: true },
    });
  }

  async resumenes(ids: readonly string[]): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: { id: { in: [...ids] } },
      select: RESUMEN,
    });
  }
}
