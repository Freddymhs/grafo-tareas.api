import { TipoConexion } from '@prisma/client';
import type {
  CarrilDelPlan,
  PertenenciaDelTablero,
} from './calcular-tablero-plan.js';

export interface Pelotita {
  /** El título del carril (la RAMA). */
  readonly carril: string;
  readonly color: string;
}

/**
 * Las pelotitas de cada pieza del plan, como en el viejo Draft de Todoist (Freddy, 2026-10-26). La primera es el color
 * de su carril, la línea paralela en la que va. Después va una por cada OTRO carril del que espera por sus DEPENDE_DE.
 * El orden lo da el emoji de la ronda. Solo cuenta lo que sigue en el plan: depender de una pieza cerrada ya no frena.
 * «Sin carril» no tiene color y no da pelotita. Puro: la web y la VR lo muestran, no lo calculan.
 */
export function calcularPelotitas(
  carriles: readonly CarrilDelPlan[],
  conexiones: readonly PertenenciaDelTablero[],
): ReadonlyMap<string, readonly Pelotita[]> {
  const carrilDe = new Map(
    carriles.flatMap((carril) =>
      carril.nodos.map((id) => [id, carril] as const),
    ),
  );
  const pelotitaDe = ({ titulo, color }: CarrilDelPlan): Pelotita[] =>
    color ? [{ carril: titulo, color }] : [];

  const esperados = (pieza: string, propio: CarrilDelPlan) => {
    const ajenos = conexiones
      .filter(
        ({ origenId, tipo }) =>
          origenId === pieza && tipo === TipoConexion.DEPENDE_DE,
      )
      .map(({ destinoId }) => carrilDe.get(destinoId))
      .filter(
        (carril): carril is CarrilDelPlan =>
          carril !== undefined && carril !== propio,
      );
    return [...new Set(ajenos)];
  };

  return new Map(
    [...carrilDe].map(([pieza, propio]) => [
      pieza,
      [propio, ...esperados(pieza, propio)].flatMap(pelotitaDe),
    ]),
  );
}
