/** Lo que una edición del grafo puede cambiar y queda en la bitácora (FASE 16). La posición no: es del visor. */
export const CAMPOS_EDITABLES = [
  'titulo',
  'descripcion',
  'resumen',
  'estado',
  'etapa',
  'etiquetas',
  'prioridad',
  'vence',
  'color',
  // FASE 17: pasar una pieza del plan a lo real (o al revés) es una edición más.
  'cara',
  // FASE 22: mover un nodo de proyecto también queda en la bitácora.
  'proyectoId',
] as const;
export type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

export interface Diferencia {
  readonly campo: CampoEditable;
  readonly antes: string | null;
  readonly despues: string | null;
}

/** El valor como lo lee una persona en la bitácora: la fecha sin hora, las etiquetas separadas por coma. */
function comoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number' || typeof valor === 'boolean')
    return `${valor}`;
  return JSON.stringify(valor);
}

/**
 * Qué campos cambian de verdad entre el nodo (`antes`) y lo que pide la edición. Lo que la edición no trae no cuenta,
 * y la misma fecha en otro formato tampoco: la bitácora es lo que cambió, no lo que se mandó.
 */
export function diferencias(
  antes: Readonly<Record<CampoEditable, unknown>>,
  pedido: Readonly<Partial<Record<CampoEditable, unknown>>>,
): Diferencia[] {
  return CAMPOS_EDITABLES.filter((campo) => pedido[campo] !== undefined)
    .map((campo) => ({
      campo,
      antes: comoTexto(antes[campo]),
      despues: comoTexto(pedido[campo]),
    }))
    .filter(({ antes: a, despues: d }) => a !== d);
}
