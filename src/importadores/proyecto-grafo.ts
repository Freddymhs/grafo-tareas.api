export const BANDERA_PROYECTO_GRAFO = '--proyecto-grafo';

const PATRON_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** El proyecto del grafo donde un importador escribe, siempre explícito: sin él no se toca la base. */
export function proyectoGrafoDe(argv: readonly string[]): string {
  const indice = argv.indexOf(BANDERA_PROYECTO_GRAFO);
  const valor = indice >= 0 ? argv[indice + 1] : undefined;
  if (valor === undefined || valor.startsWith('--')) {
    throw new Error(
      `falta ${BANDERA_PROYECTO_GRAFO} <id del proyecto del grafo>: el importador no elige proyecto`,
    );
  }
  if (!PATRON_UUID.test(valor)) {
    throw new Error(
      `${BANDERA_PROYECTO_GRAFO} tiene que ser un uuid: «${valor}»`,
    );
  }
  return valor;
}
