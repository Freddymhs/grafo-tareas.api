// A.1 (2026-10-21): el importador solo crea conexiones, así que una dependencia que un FASE_*.md dejó de declarar sigue en
// el grafo. Real 21-10: «FASE 38 → FASE 18» quedó al revés después de corregir el .md y armaba un ciclo con la nueva.
// Esto dice cuáles son; borrarlas es aparte (`--podar`). Puro.

/** Una DEPENDE_DE entre dos FASE del mismo proyecto, por su externo (`fase:38`). */
export interface Dependencia {
  readonly origen: string;
  readonly destino: string;
}

const clave = ({ origen, destino }: Dependencia) => `${origen}\u0000${destino}`;

/** Las que el grafo tiene y ningún .md declara. La dirección cuenta: 18 → 38 no cubre 38 → 18. */
export function dependenciasViejas<T extends Dependencia>(
  existentes: readonly T[],
  declaradas: readonly Dependencia[],
): T[] {
  const vigentes = new Set(declaradas.map(clave));
  return existentes.filter((dependencia) => !vigentes.has(clave(dependencia)));
}

export const textoDeDependencia = ({ origen, destino }: Dependencia) =>
  `${origen} → ${destino}`;
