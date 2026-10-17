export interface ResultadoLibera {
  /** Quedan libres en cuanto se cierra el nodo: su único bloqueo abierto era él. */
  readonly directos: readonly string[];
  /** Quedan libres después, si lo liberado antes también se cierra (la cadena completa). */
  readonly cadena: readonly string[];
}

/**
 * Qué se libera si `cerradoId` se cierra — "si Tomás contesta, se liberan N" (docs/_CONCEPTO.md § Modelo de dominio).
 *
 * `bloqueadoresAbiertos` trae, para cada nodo ABIERTO aguas abajo, sus bloqueadores ABIERTOS. Se avanza por rondas:
 * un nodo se libera cuando TODOS sus bloqueadores ya están resueltos. Es un punto fijo, así que termina aunque el
 * grafo tenga ciclos: los que se esperan entre sí nunca entran.
 */
export function calcularLibera(
  cerradoId: string,
  bloqueadoresAbiertos: ReadonlyMap<string, readonly string[]>,
): ResultadoLibera {
  // El conjunto crece ronda a ronda: es el estado del punto fijo, no se puede derivar de una vez.
  const resueltos = new Set<string>([cerradoId]);
  const rondas: string[][] = [];

  for (;;) {
    const ronda = [...bloqueadoresAbiertos]
      .filter(([id, bloqueadores]) => {
        const pendiente = !resueltos.has(id);
        const todosResueltos = bloqueadores.every((b) => resueltos.has(b));
        return pendiente && bloqueadores.length > 0 && todosResueltos;
      })
      .map(([id]) => id)
      .sort();
    if (ronda.length === 0) break;
    ronda.forEach((id) => resueltos.add(id));
    rondas.push(ronda);
  }

  const [directos = [], ...siguientes] = rondas;
  return { directos, cadena: siguientes.flat() };
}
