// Lo que es del área y no del método (C11, FASE 9): a quién se escala una duda, en qué rituales se dice algo y cómo
// se escribe cada persona. Sale de `refs.yaml` del orquestador por `REFS_ARCHIVO`; las personas son del cliente.

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

/**
 * Cómo se escribe una persona en las tarjetas del tablero (D6): cualquiera de sus alias la nombra. El orden importa:
 * se toma la primera persona con un alias en el texto, así que va primero la que contiene a otra («Ana Pérez» y «Ana»).
 */
export interface Persona {
  readonly nombre: string;
  readonly alias: readonly string[];
}

export interface Area {
  readonly escaleras: readonly Escalera[];
  readonly rituales: readonly Ritual[];
  readonly personas: readonly Persona[];
}
