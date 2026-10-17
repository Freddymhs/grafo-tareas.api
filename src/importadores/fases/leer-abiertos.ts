// Lee `Tareas/<id>/entendimiento.md` y saca los puntos de `## ⚠️ ABIERTO (n)`: cada viñeta es una duda que
// frena la task. Puro: texto → datos.
export interface AbiertoLeido {
  /** La task dueña del entendimiento (el nombre de su carpeta). */
  readonly taskId: string;
  /** Posición dentro de la sección, desde 1: con ella se arma el `externoId`. */
  readonly orden: number;
  readonly titulo: string;
  readonly texto: string;
}

const SECCION_ABIERTO = /^## [^\n]*ABIERTO[^\n]*$/m;
// Una viñeta sigue en las líneas indentadas que vienen debajo (sin ser otra viñeta).
const VIÑETA = /^- (.+(?:\n[ \t]+(?!- ).*)*)/gm;
const LARGO_TITULO = 120;
const NEGRITA = /\*\*/g;
const ETIQUETA_INICIAL = /^\[[^\]]+\]\s*/;

const titular = (texto: string) => {
  const primera = texto.split('\n')[0] ?? '';
  const limpio = primera
    .replace(NEGRITA, '')
    .replace(ETIQUETA_INICIAL, '')
    .trim();
  return limpio.length > LARGO_TITULO
    ? `${limpio.slice(0, LARGO_TITULO - 1)}…`
    : limpio;
};

export function leerAbiertos(
  taskId: string,
  md: string,
): readonly AbiertoLeido[] {
  const partes = md.split(SECCION_ABIERTO);
  const cuerpo = (partes[1] ?? '').split(/^## /m)[0] ?? '';
  return [...cuerpo.matchAll(VIÑETA)].map((m, indice) => ({
    taskId,
    orden: indice + 1,
    titulo: titular(m[1] ?? ''),
    texto: (m[1] ?? '').trim(),
  }));
}
