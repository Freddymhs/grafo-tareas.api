import { TipoConexion } from '@prisma/client';
import type {
  CarrilDelPlan,
  PertenenciaDelTablero,
} from './calcular-tablero-plan.js';

/**
 * El número de cada pieza dentro de su carril (Freddy, 2026-10-26). Es su lugar en la cadena de DEPENDE_DE de ese carril:
 * 1 si no depende de nada de su carril, y si depende, uno más que la más larga de las que espera. No sale del emoji de la
 * ronda: las rondas son de toda la HU y «no sé si el 1 azul corresponde al 1 verde». Esperar a otro carril no suma acá;
 * eso lo dicen las pelotitas (`calcularPelotitas`). Un ciclo no cuelga el cálculo: lo que ya se está recorriendo no
 * vuelve a contar. Puro.
 */
export function calcularOrden(
  carriles: readonly CarrilDelPlan[],
  conexiones: readonly PertenenciaDelTablero[],
): ReadonlyMap<string, number> {
  const carrilDe = new Map(
    carriles.flatMap((carril) =>
      carril.nodos.map((id) => [id, carril] as const),
    ),
  );
  const previasDe = (pieza: string) =>
    conexiones
      .filter(
        ({ origenId, destinoId, tipo }) =>
          origenId === pieza &&
          tipo === TipoConexion.DEPENDE_DE &&
          carrilDe.get(destinoId) === carrilDe.get(pieza),
      )
      .map(({ destinoId }) => destinoId);

  const orden = new Map<string, number>();
  const ordenDe = (pieza: string, recorriendo: ReadonlySet<string>): number => {
    const sabido = orden.get(pieza);
    if (sabido !== undefined) return sabido;
    const previas = previasDe(pieza).filter((id) => !recorriendo.has(id));
    const conPieza = new Set([...recorriendo, pieza]);
    const calculado =
      1 + Math.max(0, ...previas.map((id) => ordenDe(id, conPieza)));
    orden.set(pieza, calculado);
    return calculado;
  };

  carrilDe.forEach((_, pieza) => ordenDe(pieza, new Set()));
  return orden;
}
