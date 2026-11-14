import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
import { Injectable } from '@nestjs/common';
import { EstadoNodo, Prisma } from '@prisma/client';
import {
  ETIQUETA_CARRIL,
  ETAPA_MERGEADA,
  ETIQUETA_MERGEADA,
  ORIGEN_RITUAL,
  TIPOS_DEL_DIA,
} from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { TipoAccionable } from '../tipos/tipos-propiedades.service.js';

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

/** Alcanza con los del último instante; unos pocos más por si ese instante tocó varios campos. */
const ULTIMOS_CAMBIOS = 20;

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
export const bloqueaAhora = (
  bloqueantes: readonly string[],
): Prisma.ConexionWhereInput => ({
  tipo: { in: [...bloqueantes] },
  destino: { estado: EstadoNodo.ABIERTO },
  OR: [
    { tipo: { not: TIPO_CONEXION.DEPENDE_DE } },
    {
      destino: {
        NOT: { etiquetas: { has: ETIQUETA_MERGEADA } },
        OR: [{ etapa: null }, { etapa: { not: ETAPA_MERGEADA } }],
      },
    },
  ],
});

/** Dónde buscar «hoy puedo»: un proyecto, un espacio o todo; lo archivado nunca (un bloqueo sí cruza lo archivado). */
export interface AlcanceHoyPuedo {
  readonly proyectoId?: string;
  readonly espacioId?: string;
}

@Injectable()
export class DerivadoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existe(id: string): Promise<boolean> {
    const total = await this.prisma.nodo.count({ where: { id } });
    return total > 0;
  }

  async bloqueadoresDe(
    nodoId: string,
    bloqueantes: readonly string[],
  ): Promise<NodoResumen[]> {
    const conexiones = await this.prisma.conexion.findMany({
      where: { origenId: nodoId, ...bloqueaAhora(bloqueantes) },
      select: { destino: { select: RESUMEN } },
      orderBy: { createdAt: 'asc' },
    });
    return conexiones.map(({ destino }) => destino);
  }

  /** `notas`: las etiquetas de los complementos que no se hacen (un apunte, una decisión). */
  async hoyPuedo(
    notas: readonly string[],
    bloqueantes: readonly string[],
    accionables: readonly TipoAccionable[],
    { proyectoId, espacioId }: AlcanceHoyPuedo,
  ): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: {
        OR: accionables.map(({ espacioId: delEspacio, nombre }) => ({
          tipo: nombre,
          proyecto: { espacioId: delEspacio },
        })),
        estado: EstadoNodo.ABIERTO,
        proyecto: {
          id: proyectoId,
          espacioId,
          archivado: false,
          espacio: { archivado: false },
        },
        salientes: { none: bloqueaAhora(bloqueantes) },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: RESUMEN,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Tareas y FASE cerradas desde `desde`, sin las notas (`updatedAt` es honesto: nada lo reescribe sin un cambio). */
  async terminadas(
    desde: Date,
    notas: readonly string[],
    espacioId: string,
  ): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: {
        proyecto: { espacioId },
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
  async enColumnas(
    columnas: readonly string[],
    notas: readonly string[],
    bloqueantes: readonly string[],
    espacioId: string,
  ) {
    const nodos = await this.prisma.nodo.findMany({
      where: {
        proyecto: { espacioId },
        tipo: { in: [...TIPOS_DEL_DIA] },
        estado: EstadoNodo.ABIERTO,
        etapa: { in: [...columnas] },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: {
        ...RESUMEN,
        salientes: {
          where: bloqueaAhora(bloqueantes),
          select: { id: true },
          take: 1,
        },
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
  async detenidas(
    notas: readonly string[],
    bloqueantes: readonly string[],
    espacioId: string,
  ) {
    const nodos = await this.prisma.nodo.findMany({
      where: {
        proyecto: { espacioId },
        tipo: { in: [...TIPOS_DEL_DIA] },
        estado: EstadoNodo.ABIERTO,
        etapa: { not: null },
        salientes: { some: bloqueaAhora(bloqueantes) },
        NOT: { etiquetas: { hasSome: [...notas] } },
      },
      select: {
        ...RESUMEN,
        salientes: {
          where: bloqueaAhora(bloqueantes),
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
  async abiertosConEtiqueta(
    etiqueta: string,
    espacioId: string,
  ): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: {
        proyecto: { espacioId },
        estado: EstadoNodo.ABIERTO,
        etiquetas: { has: etiqueta },
      },
      select: RESUMEN,
      orderBy: { titulo: 'asc' },
    });
  }

  /** Los «para decir» abiertos que cuelgan de un ritual, con el nombre del ritual. */
  async paraDecir(espacioId: string) {
    const items = await this.prisma.nodo.findMany({
      where: {
        proyecto: { espacioId },
        tipo: TIPO_NODO.DAILY_ITEM,
        estado: EstadoNodo.ABIERTO,
        salientes: {
          some: {
            tipo: TIPO_CONEXION.EN_DAILY_DE,
            destino: { externoOrigen: ORIGEN_RITUAL },
          },
        },
      },
      select: {
        ...RESUMEN,
        salientes: {
          where: {
            tipo: TIPO_CONEXION.EN_DAILY_DE,
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
  async aguasAbajo(
    nodoId: string,
    bloqueantes: readonly string[],
  ): Promise<string[]> {
    const tipos = [...bloqueantes];
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
  async bloqueosDe(
    ids: readonly string[],
    bloqueantes: readonly string[],
  ): Promise<Bloqueo[]> {
    return this.prisma.conexion.findMany({
      where: {
        origenId: { in: [...ids] },
        origen: { estado: EstadoNodo.ABIERTO },
        ...bloqueaAhora(bloqueantes),
      },
      select: { origenId: true, destinoId: true },
    });
  }

  /** El grafo entero, en lo justo para armar las páginas (FASE 15): cada nodo y cada conexión, sin descripciones. */
  async paraPaginas(espacioId: string) {
    const delEspacio = { proyecto: { espacioId } };
    const [nodos, conexiones] = await Promise.all([
      this.prisma.nodo.findMany({
        where: delEspacio,
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
        where: { origen: delEspacio, destino: delEspacio },
        select: { origenId: true, destinoId: true, tipo: true },
      }),
    ]);
    return { nodos, conexiones };
  }

  /**
   * Lo que arma el tablero del plan (FASE 17): los nodos de las páginas pedidas más los carriles (RAMA con la etiqueta
   * `carril`, que no entran a ninguna página) y las pertenencias y dependencias que salen de esos nodos. Se siguen los
   * DEPENDE_DE hasta el final: una pieza ya tomada no está en la página del plan, pero sigue en su línea.
   */
  async paraTableroPlan(ids: readonly string[], espacioId: string) {
    const conexiones = await this.dependenciasDesde(ids);
    const alcanzados = [
      ...new Set([...ids, ...conexiones.map(({ destinoId }) => destinoId)]),
    ];
    const nodos = await this.prisma.nodo.findMany({
      where: {
        OR: [
          { id: { in: alcanzados } },
          {
            tipo: TIPO_NODO.RAMA,
            etiquetas: { has: ETIQUETA_CARRIL },
            proyecto: { espacioId },
          },
        ],
      },
      select: RESUMEN,
    });
    return { nodos, conexiones };
  }

  /** Las pertenencias y dependencias que salen de `ids` y, por DEPENDE_DE, de todo lo que alcanzan (sin repetir). */
  private async dependenciasDesde(
    frontera: readonly string[],
    vistos: ReadonlySet<string> = new Set(frontera),
  ): Promise<{ origenId: string; destinoId: string; tipo: string }[]> {
    if (frontera.length === 0) return [];
    const salientes = await this.prisma.conexion.findMany({
      where: {
        origenId: { in: [...frontera] },
        tipo: { in: [TIPO_CONEXION.PERTENECE_A, TIPO_CONEXION.DEPENDE_DE] },
      },
      select: { origenId: true, destinoId: true, tipo: true },
    });
    const siguientes = [
      ...new Set(
        salientes
          .filter(
            ({ tipo, destinoId }) =>
              tipo === TIPO_CONEXION.DEPENDE_DE && !vistos.has(destinoId),
          )
          .map(({ destinoId }) => destinoId),
      ),
    ];
    const masAdelante = await this.dependenciasDesde(
      siguientes,
      new Set([...vistos, ...siguientes]),
    );
    return [...salientes, ...masAdelante];
  }

  /** Los últimos cambios de la bitácora de esos nodos: lo justo para saber qué cambió último en una página. */
  async ultimosCambiosDe(ids: readonly string[]) {
    return this.prisma.cambio.findMany({
      where: { nodoId: { in: [...ids] } },
      orderBy: { createdAt: 'desc' },
      take: ULTIMOS_CAMBIOS,
      select: {
        nodoId: true,
        tipo: true,
        campo: true,
        despues: true,
        createdAt: true,
      },
    });
  }

  /** Todas las conexiones, en lo justo para recorrer el árbol (la familia de un nodo, FASE 15). */
  async enlaces() {
    return this.prisma.conexion.findMany({
      select: { origenId: true, destinoId: true, tipo: true },
    });
  }

  /** Los nodos de otros proyectos conectados (en cualquier dirección) con algún nodo de este. */
  async vecinosDe(proyectoId: string) {
    return this.prisma.nodo.findMany({
      where: {
        proyectoId: { not: proyectoId },
        OR: [
          { salientes: { some: { destino: { proyectoId } } } },
          { entrantes: { some: { origen: { proyectoId } } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async existeProyecto(id: string): Promise<boolean> {
    const total = await this.prisma.proyecto.count({ where: { id } });
    return total > 0;
  }

  async resumenes(ids: readonly string[]): Promise<NodoResumen[]> {
    return this.prisma.nodo.findMany({
      where: { id: { in: [...ids] } },
      select: RESUMEN,
    });
  }
}
