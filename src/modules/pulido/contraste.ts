import { TipoCambio } from '@prisma/client';

export const EstadoContraste = {
  EDITADO: 'EDITADO',
  DESCARTADO: 'DESCARTADO',
} as const;
export type EstadoContraste =
  (typeof EstadoContraste)[keyof typeof EstadoContraste];

interface NodoConFuente {
  readonly id: string;
  readonly externoOrigen: string | null;
  readonly externoId: string | null;
  readonly titulo: string;
}

interface DescarteConFuente {
  readonly externoOrigen: string | null;
  readonly externoId: string | null;
  readonly titulo: string;
  readonly motivo: string;
}

interface EntradaBitacora {
  readonly nodoId: string;
  readonly tipo: TipoCambio;
  readonly campo: string | null;
  readonly motivo: string | null;
}

export interface Diferencia {
  readonly externoOrigen: string;
  readonly externoId: string;
  readonly titulo: string;
  readonly estado: EstadoContraste;
  /** En un EDITADO: qué campos se cambiaron en el grafo (sin repetir, ordenados). */
  readonly campos: readonly string[];
  /** El último motivo anotado. */
  readonly motivo: string | null;
}

export interface Contraste {
  /** `total` es el denominador: todo lo que vino de una fuente (lo que sigue y lo descartado). */
  readonly resumen: {
    readonly total: number;
    readonly iguales: number;
    readonly editados: number;
    readonly descartados: number;
  };
  readonly diferencias: readonly Diferencia[];
}

const conFuente = <
  T extends { externoOrigen: string | null; externoId: string | null },
>(
  fila: T,
): fila is T & { externoOrigen: string; externoId: string } =>
  fila.externoOrigen !== null && fila.externoId !== null;

/**
 * El contraste Todoist ↔ grafo, visto desde el grafo (FASE 16): de todo lo que vino de una fuente, qué sigue igual, qué se
 * editó acá (según la bitácora) y qué se descartó, con su motivo. Es lo que Freddy revisa antes de migrar del grafo a
 * Todoist. Lo creado en el grafo no entra: no tiene contraparte. Lo que falte en el grafo y siga en la fuente lo dice el
 * importador en seco (sus «nuevos»).
 */
export function calcularContraste(
  nodos: readonly NodoConFuente[],
  descartes: readonly DescarteConFuente[],
  bitacora: readonly EntradaBitacora[],
): Contraste {
  const ediciones = bitacora.filter(({ tipo }) => tipo === TipoCambio.EDICION);
  const editados = nodos.filter(conFuente).flatMap((nodo) => {
    const suyas = ediciones.filter(({ nodoId }) => nodoId === nodo.id);
    if (suyas.length === 0) return [];
    const campos = [
      ...new Set(suyas.flatMap(({ campo }) => (campo ? [campo] : []))),
    ].sort();
    return [
      {
        externoOrigen: nodo.externoOrigen,
        externoId: nodo.externoId,
        titulo: nodo.titulo,
        estado: EstadoContraste.EDITADO,
        campos,
        motivo: suyas[suyas.length - 1]?.motivo ?? null,
      },
    ];
  });
  const descartados = descartes.filter(conFuente).map((descarte) => ({
    externoOrigen: descarte.externoOrigen,
    externoId: descarte.externoId,
    titulo: descarte.titulo,
    estado: EstadoContraste.DESCARTADO,
    campos: [],
    motivo: descarte.motivo,
  }));
  const importados = nodos.filter(conFuente).length;
  return {
    resumen: {
      total: importados + descartados.length,
      iguales: importados - editados.length,
      editados: editados.length,
      descartados: descartados.length,
    },
    diferencias: [...editados, ...descartados],
  };
}
