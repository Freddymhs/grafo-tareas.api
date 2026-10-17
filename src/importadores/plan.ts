import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';

/** Lo que todo importador produce antes de escribir: nodos y conexiones por `externoId`, aplicables en una transacción. */
export interface NodoPlan {
  readonly externoId: string;
  readonly tipo: TipoNodo;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly estado: EstadoNodo;
  readonly color: string | null;
  readonly etapa: string | null;
  readonly etiquetas: readonly string[];
  readonly prioridad: number | null;
  readonly vence: string | null;
  /** Un nodo que varios importadores comparten (la HU) lleva su propio origen en vez del del plan. */
  readonly origen?: string;
  /** Solo se crea si no existe: quien sabe menos (el tablero, que solo ve «HU 20379») no pisa al que sabe más. */
  readonly soloSiFalta?: boolean;
}

export interface ConexionPlan {
  readonly origenExternoId: string;
  readonly destinoExternoId: string;
  readonly tipo: TipoConexion;
}

export interface Plan {
  readonly origen: string;
  readonly nodos: readonly NodoPlan[];
  readonly conexiones: readonly ConexionPlan[];
}

/** Un nodo sintetizado (rama, fase, persona) no tiene tablero: sin etapa, etiquetas ni fecha. */
export const SIN_TABLERO = {
  descripcion: null,
  estado: EstadoNodo.ABIERTO,
  etapa: null,
  etiquetas: [] as const,
  prioridad: null,
  vence: null,
};

/**
 * La HU (el PBI del tracker: un solo nivel, con Tasks debajo) es de todos los importadores: el de FASE la
 * nombra con su título real; el del tablero solo conoce su número. Mismo origen y mismo `externoId` en los dos.
 */
export const ORIGEN_TRACKER = 'tracker';
export const externoHistoria = (id: string) => `hu:${id}`;
export const tituloHistoria = (id: string, titulo: string | null) =>
  titulo ? `HU ${id} · ${titulo}` : `HU ${id}`;

export function nodoHistoria(
  id: string,
  titulo: string | null,
  soloSiFalta: boolean,
): NodoPlan {
  return {
    externoId: externoHistoria(id),
    tipo: TipoNodo.HISTORIA,
    titulo: tituloHistoria(id, titulo),
    ...SIN_TABLERO,
    color: null,
    origen: ORIGEN_TRACKER,
    soloSiFalta,
  };
}
