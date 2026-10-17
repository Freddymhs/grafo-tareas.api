// Lo que es del área y no del método (C11, FASE 9): a quién se escala una duda y en qué rituales se dice algo.
// Sale de `refs.yaml` del orquestador por `REFS_ARCHIVO`; las personas son del cliente.

export interface Escalera {
  readonly clave: string;
  /** Lo que se hace antes de preguntarle a nadie (p. ej. «contrastar con el código»). */
  readonly antes: string | null;
  /** En orden: escalar = pasar a la siguiente. */
  readonly personas: readonly string[];
}

export interface Ritual {
  readonly clave: string;
  readonly nombre: string;
}

export interface Area {
  readonly escaleras: readonly Escalera[];
  readonly rituales: readonly Ritual[];
}
