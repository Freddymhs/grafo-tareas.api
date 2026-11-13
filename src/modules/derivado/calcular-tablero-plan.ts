import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
import { Cara, EstadoNodo } from '@prisma/client';
import {
  ETIQUETA_CARRIL,
  ETIQUETA_PIEZA,
  PREFIJO_RONDA,
} from '../../common/constants/index.js';

export interface NodoDelTablero {
  readonly id: string;
  readonly tipo: string;
  readonly titulo: string;
  readonly estado: EstadoNodo | null;
  readonly cara: Cara;
  readonly color: string | null;
  readonly etiquetas: readonly string[];
}

export interface PertenenciaDelTablero {
  readonly origenId: string;
  readonly destinoId: string;
  readonly tipo: string;
}

export interface CarrilDelPlan {
  /** La RAMA del carril; `null` = las piezas que no cuelgan de ninguno. */
  readonly id: string | null;
  readonly titulo: string;
  readonly color: string | null;
  /** Las piezas abiertas del carril, en orden de ronda (y de título dentro de la ronda). */
  readonly nodos: readonly string[];
}

export const TITULO_SIN_CARRIL = 'Sin carril';
const SIN_RONDA = Number.POSITIVE_INFINITY;

const rondaDe = ({ etiquetas }: NodoDelTablero) => {
  const etiqueta = etiquetas.find((e) => e.startsWith(PREFIJO_RONDA));
  const numero = etiqueta ? Number(etiqueta.slice(PREFIJO_RONDA.length)) : NaN;
  return Number.isFinite(numero) ? numero : SIN_RONDA;
};

const porRonda = (a: NodoDelTablero, b: NodoDelTablero) =>
  rondaDe(a) - rondaDe(b) ||
  a.titulo.localeCompare(b.titulo, undefined, { numeric: true });

/**
 * El tablero del plan (FASE 17): una columna por carril —la zona de código del reparto, una RAMA con la etiqueta
 * `carril`— con sus piezas abiertas en el orden en que se trabajan (todas las de la ronda 1, después las de la 2…).
 * Lo que no cuelga de un carril va a «Sin carril», al final. Recibe los nodos de la cara plan que se quieren ver
 * (una HU o todas). Una pieza ya tomada y abierta (pasó a lo real, conserva la etiqueta `pieza`) sigue en su línea:
 * está en curso, conserva su número y sigue frenando a las que la esperan (Freddy tomó la 26958 el 26-10 y la 26963,
 * que la espera, se leía libre). Puro: la web lo muestra, no lo calcula.
 */
export function calcularTableroPlan(
  nodos: readonly NodoDelTablero[],
  conexiones: readonly PertenenciaDelTablero[],
): CarrilDelPlan[] {
  const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const esCarril = (id: string) => {
    const nodo = porId.get(id);
    return (
      nodo?.tipo === TIPO_NODO.RAMA && nodo.etiquetas.includes(ETIQUETA_CARRIL)
    );
  };
  const esTomada = ({ cara, etiquetas }: NodoDelTablero) =>
    cara === Cara.REAL && etiquetas.includes(ETIQUETA_PIEZA);
  const piezas = nodos.filter(
    (nodo) =>
      nodo.tipo === TIPO_NODO.TAREA &&
      nodo.estado === EstadoNodo.ABIERTO &&
      (nodo.cara === Cara.PLAN || esTomada(nodo)),
  );
  const carrilDe = (pieza: string) =>
    conexiones.find(
      ({ origenId, destinoId, tipo }) =>
        origenId === pieza &&
        tipo === TIPO_CONEXION.PERTENECE_A &&
        esCarril(destinoId),
    )?.destinoId ?? null;

  const enCarril = new Map<string | null, NodoDelTablero[]>();
  piezas.forEach((pieza) => {
    const carril = carrilDe(pieza.id);
    enCarril.set(carril, [...(enCarril.get(carril) ?? []), pieza]);
  });

  const carriles = [...enCarril.entries()]
    .filter(
      (entrada): entrada is [string, NodoDelTablero[]] => entrada[0] !== null,
    )
    .map(([id, deCarril]) => {
      const rama = porId.get(id);
      return {
        id,
        titulo: rama?.titulo ?? id,
        color: rama?.color ?? null,
        nodos: deCarril.toSorted(porRonda).map(({ id: pieza }) => pieza),
      };
    })
    .toSorted((a, b) => a.titulo.localeCompare(b.titulo));
  const sueltas = enCarril.get(null) ?? [];
  const sinCarril: CarrilDelPlan[] =
    sueltas.length === 0
      ? []
      : [
          {
            id: null,
            titulo: TITULO_SIN_CARRIL,
            color: null,
            nodos: sueltas.toSorted(porRonda).map(({ id }) => id),
          },
        ];
  return [...carriles, ...sinCarril];
}
