import { Cara, EstadoNodo, TipoCambio } from '@prisma/client';

export interface CambioDeLaBitacora {
  readonly nodoId: string;
  readonly tipo: TipoCambio;
  readonly campo: string | null;
  readonly despues: string | null;
  readonly createdAt: Date;
}

export interface UltimoCambio {
  readonly nodoId: string;
  readonly cuando: Date;
  /** Lo que pasó, en palabras: «pasó a Trabajo», «se cerró»… */
  readonly que: string;
}

/** Una edición toca varios campos en el mismo instante: el que se cuenta es el que más le dice a Freddy. */
const IMPORTANCIA = ['cara', 'estado', 'etapa', 'titulo', 'resumen'] as const;
const NOMBRE_CARA: Readonly<Record<Cara, string>> = {
  [Cara.REAL]: 'Trabajo',
  [Cara.PLAN]: 'Plan',
};

function enPalabras({ tipo, campo, despues }: CambioDeLaBitacora): string {
  if (tipo === TipoCambio.DESCARTE) return 'se descartó';
  if (tipo === TipoCambio.RESTAURACION) return 'se restauró';
  if (campo === 'cara')
    return `pasó a ${NOMBRE_CARA[despues as Cara] ?? despues ?? ''}`;
  if (campo === 'estado')
    return despues === EstadoNodo.CERRADO ? 'se cerró' : 'se reabrió';
  if (campo === 'etapa') return `pasó a ${despues ?? 'la entrada'}`;
  if (campo === 'titulo') return 'cambió de nombre';
  if (campo === 'resumen') return 'cambió su resumen';
  return campo ? `cambió ${campo}` : 'cambió';
}

const importancia = ({ campo }: CambioDeLaBitacora) => {
  const lugar = IMPORTANCIA.indexOf(campo as (typeof IMPORTANCIA)[number]);
  return lugar === -1 ? IMPORTANCIA.length : lugar;
};

/**
 * Lo último que cambió en una página (Freddy, 2026-10-26: otra sesión tomó la 26958 y el plan cambió sin que supiera por
 * qué; «antes no estaba así»). De los cambios de sus nodos, el más reciente; si en ese instante cambiaron varios campos
 * del mismo nodo, el más importante («pasó a Trabajo» antes que «cambió etapa»). Puro.
 */
export function calcularUltimoCambio(
  cambios: readonly CambioDeLaBitacora[],
  nodos: readonly string[],
): UltimoCambio | null {
  const enLaPagina = new Set(nodos);
  const deLaPagina = cambios.filter(({ nodoId }) => enLaPagina.has(nodoId));
  const masReciente = deLaPagina.reduce<CambioDeLaBitacora | null>(
    (ultimo, cambio) =>
      !ultimo || cambio.createdAt > ultimo.createdAt ? cambio : ultimo,
    null,
  );
  if (!masReciente) return null;
  const mismoInstante = deLaPagina.filter(
    ({ nodoId, createdAt }) =>
      nodoId === masReciente.nodoId &&
      createdAt.getTime() === masReciente.createdAt.getTime(),
  );
  const elegido = mismoInstante.toSorted(
    (a, b) => importancia(a) - importancia(b),
  )[0];
  return {
    nodoId: elegido.nodoId,
    cuando: elegido.createdAt,
    que: enPalabras(elegido),
  };
}
