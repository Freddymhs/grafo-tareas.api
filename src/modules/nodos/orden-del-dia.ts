// El orden del día (AHORA de Herdr, ordenado a mano por Freddy) guardado como etiquetas `hoy:<n>`. Puro.
import { PREFIJO_HOY, etiquetaDeHoy } from '../../common/constants/index.js';

interface ConEtiquetas {
  readonly id: string;
  readonly etiquetas: readonly string[];
}

/** Las etiquetas sin el lugar de otro día y, si va hoy, con el suyo al final. */
export function etiquetasDelDia(
  etiquetas: readonly string[],
  lugar: number | null,
): string[] {
  const sinOtroDia = etiquetas.filter(
    (etiqueta) => !etiqueta.startsWith(PREFIJO_HOY),
  );
  return lugar === null ? sinOtroDia : [...sinOtroDia, etiquetaDeHoy(lugar)];
}

const mismas = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((etiqueta, i) => etiqueta === b[i]);

/** Los nodos cuyas etiquetas cambian al poner `ids` como el día, en ese orden; lo que queda igual no se escribe. */
export function cambiosDelDia(
  nodos: readonly ConEtiquetas[],
  ids: readonly string[],
): ConEtiquetas[] {
  const lugarDe = new Map(ids.map((id, i) => [id, i + 1]));
  const conNuevas = nodos.map(({ id, etiquetas }) => ({
    id,
    antes: etiquetas,
    etiquetas: etiquetasDelDia(etiquetas, lugarDe.get(id) ?? null),
  }));
  return conNuevas
    .filter(({ antes, etiquetas }) => !mismas(antes, etiquetas))
    .map(({ id, etiquetas }) => ({ id, etiquetas }));
}
