import { TIPO_NODO } from '../../common/constants/tipos.constants.js';
import { Cara, EstadoNodo } from '@prisma/client';

/** Lo que una pieza trae al grafo antes de escribir: nodos y conexiones por `externoId`, aplicables en una transacción. */
export interface NodoPlan {
  readonly externoId: string;
  readonly tipo: string;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly estado: EstadoNodo;
  readonly color: string | null;
  readonly etapa: string | null;
  readonly etiquetas: readonly string[];
  readonly prioridad: number | null;
  readonly vence: string | null;
  /** Cuándo nació en su fuente (ISO). Sin ella, el nodo conserva la que ya tiene (o la de su creación acá). */
  readonly fechaOrigen?: string | null;
  /** De qué cara de su HU es (FASE 17): la trae quien sabe de qué proyecto vino. Sin ella, el nodo conserva la suya. */
  readonly cara?: Cara;
  /** Un nodo compartido (la HU, el carril) lleva su propio origen en vez del del plan. */
  readonly origen?: string;
  /** Solo se crea si no existe: quien sabe menos (el tablero, que solo ve «HU 20379») no pisa al que sabe más. */
  readonly soloSiFalta?: boolean;
}

export interface ConexionPlan {
  readonly origenExternoId: string;
  readonly destinoExternoId: string;
  readonly tipo: string;
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

/** La HU (el PBI del tracker: un solo nivel, con Tasks debajo) es compartida: una pieza solo conoce su número. */
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
    tipo: TIPO_NODO.HISTORIA,
    titulo: tituloHistoria(id, titulo),
    ...SIN_TABLERO,
    color: null,
    origen: ORIGEN_TRACKER,
    soloSiFalta,
  };
}
