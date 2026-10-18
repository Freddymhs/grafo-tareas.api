import { TipoConexion } from '@prisma/client';

/** Lo mínimo de una conexión para recorrer el árbol. */
export interface Enlace {
  readonly origenId: string;
  readonly destinoId: string;
  readonly tipo: TipoConexion;
}

/** Para cada nodo, lo que le PERTENECE_A directo (sus hijos): la FASE de una HU, la tarjeta de una FASE. */
export function hijosPorPertenencia(
  conexiones: readonly Enlace[],
): ReadonlyMap<string, readonly string[]> {
  const hijosDe = new Map<string, string[]>();
  conexiones
    .filter(({ tipo }) => tipo === TipoConexion.PERTENECE_A)
    .forEach(({ origenId, destinoId }) => {
      hijosDe.set(destinoId, [...(hijosDe.get(destinoId) ?? []), origenId]);
    });
  return hijosDe;
}

/** Lo que cuelga de `raiz` siguiendo PERTENECE_A al revés: sus FASE, las tarjetas de esas FASE, las piezas… */
export function arbolDe(
  raiz: string,
  hijosDe: ReadonlyMap<string, readonly string[]>,
): Set<string> {
  // El conjunto crece hasta que nada nuevo pertenece: es el estado del recorrido. Un ciclo no lo cuelga.
  const visitados = new Set<string>([raiz]);
  const pendientes = [raiz];
  while (pendientes.length > 0) {
    const actual = pendientes.pop() ?? raiz;
    (hijosDe.get(actual) ?? [])
      .filter((hijo) => !visitados.has(hijo))
      .forEach((hijo) => {
        visitados.add(hijo);
        pendientes.push(hijo);
      });
  }
  return visitados;
}
