import { Cara, EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { CONEXIONES_BLOQUEANTES } from '../../common/constants/index.js';
import { arbolDe, hijosPorPertenencia } from './arbol.js';

/** La página de lo que ninguna HU trae (notas, retros, onboarding): va última. */
export const PAGINA_SIN_HU = 'sin-hu';
const TITULO_SIN_HU = 'Sin HU';
/** La cara plan de un libro (FASE 17) es otra página, con su propio acomodo: su id es el del libro con este sufijo. */
const SUFIJO_PLAN = ':plan';
export const paginaDelPlan = (libro: string) => `${libro}${SUFIJO_PLAN}`;

export interface NodoDePagina {
  readonly id: string;
  readonly tipo: TipoNodo;
  readonly titulo: string;
  readonly estado: EstadoNodo;
  readonly cara: Cara;
}

export interface ConexionDePagina {
  readonly origenId: string;
  readonly destinoId: string;
  readonly tipo: TipoConexion;
}

export interface Pagina {
  /** El id de la HU, o `PAGINA_SIN_HU`; la cara plan, con `paginaDelPlan`. */
  readonly id: string;
  /** Las dos caras de una HU son el mismo libro: el id de su página real. */
  readonly libro: string;
  readonly cara: Cara;
  readonly titulo: string;
  readonly historiaId: string | null;
  readonly nodos: readonly string[];
  /** Tareas abiertas de la página: lo que la pestaña muestra al lado del nombre. */
  readonly abiertas: number;
}

/**
 * Las páginas de la VR (FASE 15): una por HU, para trabajar una a la vez. Una página trae su árbol (lo que le
 * PERTENECE_A, directo o a través de una FASE) más lo que bloquea a lo suyo, un salto: la duda, la persona, la tarea de
 * la que depende. Si lo que bloquea es una duda, también a quién espera. Las ramas no entran: son el color. Lo que
 * ninguna HU trae va a «Sin HU», con la misma regla (una tarjeta suelta llega con lo que necesita, aunque sea de una HU).
 * Cada libro tiene dos caras (FASE 17): la real, sin nada del plan, y —si tiene— la del plan, justo después: la HU, sus
 * piezas del plan y lo que cuelga de ellas. Lo que necesita una cara cruza a la otra, a un salto, como entre HU. Vive en
 * la API: la VR muestra la página, no decide qué hay en ella.
 */
export function calcularPaginas(
  nodos: readonly NodoDePagina[],
  conexiones: readonly ConexionDePagina[],
): Pagina[] {
  const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
  const esRama = (id: string) => porId.get(id)?.tipo === TipoNodo.RAMA;
  const hijosDe = hijosPorPertenencia(conexiones);
  const bloqueantes = conexiones.filter(({ tipo }) =>
    CONEXIONES_BLOQUEANTES.includes(tipo),
  );
  const bloqueadoresDe = (ids: ReadonlySet<string>) =>
    bloqueantes
      .filter(({ origenId }) => ids.has(origenId))
      .map(({ destinoId }) => destinoId);
  const esDuda = (id: string) => porId.get(id)?.tipo === TipoNodo.DUDA;
  const esPlan = (id: string) => porId.get(id)?.cara === Cara.PLAN;
  const esReal = (id: string) => !esPlan(id);

  // La regla de toda página: lo suyo y lo que eso necesita, a un salto (y, si es una duda, a quién espera).
  const conLoQueNecesita = (propios: ReadonlySet<string>): string[] => {
    const bloqueadores = bloqueadoresDe(propios);
    const dudas = new Set(bloqueadores.filter(esDuda));
    const aQuienEsperan = bloqueadoresDe(dudas);
    const todos = new Set([...propios, ...bloqueadores, ...aQuienEsperan]);
    return [...todos].filter((id) => !esRama(id));
  };
  const abiertasEn = (ids: readonly string[]) =>
    ids.filter((id) => {
      const nodo = porId.get(id);
      return (
        nodo?.tipo === TipoNodo.TAREA && nodo.estado === EstadoNodo.ABIERTO
      );
    }).length;

  const historias = nodos
    .filter(({ tipo }) => tipo === TipoNodo.HISTORIA)
    .toSorted((a, b) =>
      a.titulo.localeCompare(b.titulo, undefined, { numeric: true }),
    );
  const pagina = (
    libro: string,
    cara: Cara,
    titulo: string,
    historiaId: string | null,
    propios: ReadonlySet<string>,
  ): Pagina => {
    const ids = conLoQueNecesita(propios);
    const id = cara === Cara.PLAN ? paginaDelPlan(libro) : libro;
    return {
      id,
      libro,
      cara,
      titulo,
      historiaId,
      nodos: ids,
      abiertas: abiertasEn(ids),
    };
  };

  const deHistorias: Pagina[] = historias.flatMap(({ id, titulo }) => {
    const real = pagina(
      id,
      Cara.REAL,
      titulo,
      id,
      arbolDe(id, hijosDe, esReal),
    );
    // El plan de la HU: sus piezas (de donde cuelguen) y lo que cuelga de ellas.
    const piezas = [...arbolDe(id, hijosDe)].filter(esPlan);
    if (piezas.length === 0) return [real];
    const delPlan = new Set([
      id,
      ...piezas.flatMap((pieza) => [...arbolDe(pieza, hijosDe)]),
    ]);
    return [real, pagina(id, Cara.PLAN, titulo, id, delPlan)];
  });

  const yaEnUnaPagina = new Set(deHistorias.flatMap(({ nodos: ids }) => ids));
  const sueltos = nodos
    .map(({ id }) => id)
    .filter((id) => !yaEnUnaPagina.has(id) && !esRama(id));
  const sinHu = [Cara.REAL, Cara.PLAN].flatMap((cara): Pagina[] => {
    const deLaCara = sueltos.filter(
      (id) => (cara === Cara.PLAN) === esPlan(id),
    );
    if (deLaCara.length === 0) return [];
    return [
      pagina(PAGINA_SIN_HU, cara, TITULO_SIN_HU, null, new Set(deLaCara)),
    ];
  });
  return [...deHistorias, ...sinHu];
}
