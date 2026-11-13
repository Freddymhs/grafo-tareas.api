import { TIPO_CONEXION } from '../../common/constants/tipos.constants.js';
import type {
  CarrilDelPlan,
  PertenenciaDelTablero,
} from './calcular-tablero-plan.js';

export interface Pelotita {
  /** El título del carril (la RAMA). */
  readonly carril: string;
  readonly color: string;
  /**
   * En la pelotita de OTRO carril: el número (`calcularOrden`) de la tarjeta que espera en esa línea, la última si son
   * varias (esperar al 3 ya incluye al 1 y al 2). En la de su propio carril, `null`.
   */
  readonly espera: number | null;
}

/**
 * Las pelotitas de cada pieza del plan, como en el viejo Draft de Todoist (Freddy, 2026-10-26). La primera es el color
 * de su carril, la línea paralela en la que va. Después va una por cada OTRO carril del que espera por sus DEPENDE_DE,
 * con el número de la tarjeta que espera: la pelotita sola decía la línea pero no la tarjeta, y confundía. Solo cuenta
 * lo que sigue en el plan: depender de una pieza cerrada ya no frena. «Sin carril» no tiene color y no da pelotita.
 * Puro: la web y la VR lo muestran, no lo calculan.
 */
export function calcularPelotitas(
  carriles: readonly CarrilDelPlan[],
  conexiones: readonly PertenenciaDelTablero[],
  orden: ReadonlyMap<string, number>,
): ReadonlyMap<string, readonly Pelotita[]> {
  const carrilDe = new Map(
    carriles.flatMap((carril) =>
      carril.nodos.map((id) => [id, carril] as const),
    ),
  );
  const pelotitaDe = (
    { titulo, color }: CarrilDelPlan,
    espera: number | null,
  ): Pelotita[] => (color ? [{ carril: titulo, color, espera }] : []);

  const esperados = (pieza: string, propio: CarrilDelPlan) => {
    const ultimaPorCarril = new Map<CarrilDelPlan, number>();
    conexiones
      .filter(
        ({ origenId, tipo }) =>
          origenId === pieza && tipo === TIPO_CONEXION.DEPENDE_DE,
      )
      .forEach(({ destinoId }) => {
        const carril = carrilDe.get(destinoId);
        if (!carril || carril === propio) return;
        const numero = orden.get(destinoId) ?? 1;
        ultimaPorCarril.set(
          carril,
          Math.max(numero, ultimaPorCarril.get(carril) ?? 0),
        );
      });
    return [...ultimaPorCarril].flatMap(([carril, numero]) =>
      pelotitaDe(carril, numero),
    );
  };

  return new Map(
    [...carrilDe].map(([pieza, propio]) => [
      pieza,
      [...pelotitaDe(propio, null), ...esperados(pieza, propio)],
    ]),
  );
}
