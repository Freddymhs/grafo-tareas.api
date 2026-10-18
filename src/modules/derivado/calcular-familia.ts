import { arbolDe, hijosPorPertenencia, type Enlace } from './arbol.js';

/**
 * La familia de un nodo (FASE 15, iluminar al seleccionarlo en la VR): él, lo que cuelga de él —su árbol por
 * PERTENECE_A, como en las páginas— y con qué se conecta directo (su FASE, su rama, lo que lo bloquea). La VR ilumina
 * esto y apaga lo demás; no lo calcula.
 */
export function calcularFamilia(
  id: string,
  conexiones: readonly Enlace[],
): string[] {
  const arbol = arbolDe(id, hijosPorPertenencia(conexiones));
  const vecinos = conexiones.flatMap(({ origenId, destinoId }) => {
    if (origenId === id) return [destinoId];
    if (destinoId === id) return [origenId];
    return [];
  });
  return [...new Set([...arbol, ...vecinos])];
}
