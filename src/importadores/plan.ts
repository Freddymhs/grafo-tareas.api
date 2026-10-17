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
