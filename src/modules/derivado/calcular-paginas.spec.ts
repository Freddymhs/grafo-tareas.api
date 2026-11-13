import {
  TIPO_CONEXION,
  TIPO_NODO,
} from '../../common/constants/tipos.constants.js';
import { Cara, EstadoNodo } from '@prisma/client';
import {
  PAGINA_SIN_HU,
  calcularPaginas as calcular,
  paginaDelPlan,
  type ConexionDePagina,
  type NodoDePagina,
} from './calcular-paginas';

const BLOQUEANTES: readonly string[] = [
  TIPO_CONEXION.DEPENDE_DE,
  TIPO_CONEXION.ESPERA_RESPUESTA_DE,
  TIPO_CONEXION.BLOQUEADA_POR,
];
const calcularPaginas = (
  nodos: readonly NodoDePagina[],
  conexiones: readonly ConexionDePagina[],
) => calcular(nodos, conexiones, BLOQUEANTES);

const nodo = (
  id: string,
  tipo: string,
  estado: EstadoNodo = EstadoNodo.ABIERTO,
  cara: Cara = Cara.REAL,
  etiquetas: readonly string[] = [],
  etapa: string | null = null,
): NodoDePagina => ({ id, tipo, titulo: id, estado, cara, etiquetas, etapa });
const conexion = (
  origenId: string,
  tipo: string,
  destinoId: string,
): ConexionDePagina => ({ origenId, destinoId, tipo });
const { PERTENECE_A, BLOQUEADA_POR, ESPERA_RESPUESTA_DE, DEPENDE_DE } =
  TIPO_CONEXION;

/** Dos HU como las del SAG: el árbol HU → FASE → tarjeta, una pieza del Draft, ramas y lo que bloquea. */
const nodos: NodoDePagina[] = [
  nodo('HU 20379', TIPO_NODO.HISTORIA),
  nodo('HU 19565', TIPO_NODO.HISTORIA),
  nodo('fase-a', TIPO_NODO.FASE),
  nodo('tarjeta-a', TIPO_NODO.TAREA),
  nodo('cerrada-a', TIPO_NODO.TAREA, EstadoNodo.CERRADO),
  nodo('pieza-a', TIPO_NODO.TAREA),
  nodo('fase-b', TIPO_NODO.FASE),
  nodo('tarjeta-b', TIPO_NODO.TAREA),
  nodo('hija-de-b', TIPO_NODO.TAREA),
  nodo('duda', TIPO_NODO.DUDA),
  nodo('persona', TIPO_NODO.PERSONA),
  nodo('rama-azul', TIPO_NODO.RAMA),
  nodo('nota-suelta', TIPO_NODO.TAREA),
];
const conexiones: ConexionDePagina[] = [
  conexion('fase-a', PERTENECE_A, 'HU 19565'),
  conexion('tarjeta-a', PERTENECE_A, 'fase-a'),
  conexion('cerrada-a', PERTENECE_A, 'fase-a'),
  conexion('pieza-a', PERTENECE_A, 'HU 19565'),
  conexion('tarjeta-a', PERTENECE_A, 'rama-azul'),
  conexion('tarjeta-a', BLOQUEADA_POR, 'duda'),
  conexion('duda', ESPERA_RESPUESTA_DE, 'persona'),
  conexion('fase-b', PERTENECE_A, 'HU 20379'),
  conexion('tarjeta-b', PERTENECE_A, 'fase-b'),
  conexion('hija-de-b', PERTENECE_A, 'tarjeta-b'),
  conexion('tarjeta-a', DEPENDE_DE, 'tarjeta-b'),
];

describe('calcularPaginas — una página por HU (FASE 15, «la API decide»)', () => {
  const paginas = calcularPaginas(nodos, conexiones);
  const pagina = (id: string) => paginas.find((p) => p.id === id);
  const contenido = (id: string) => [...(pagina(id)?.nodos ?? [])].sort();

  it('una página por HU, ordenadas por número, y «Sin HU» al final', () => {
    expect(paginas.map(({ id }) => id)).toEqual([
      'HU 19565',
      'HU 20379',
      PAGINA_SIN_HU,
    ]);
    expect(pagina('HU 19565')?.historiaId).toBe('HU 19565');
    expect(pagina(PAGINA_SIN_HU)?.historiaId).toBeNull();
  });

  it('la HU trae su árbol: sus FASE, las tarjetas de esas FASE y las piezas que le pertenecen', () => {
    expect(contenido('HU 20379')).toEqual([
      'HU 20379',
      'fase-b',
      'hija-de-b',
      'tarjeta-b',
    ]);
    expect(contenido('HU 19565')).toEqual(
      expect.arrayContaining([
        'HU 19565',
        'fase-a',
        'tarjeta-a',
        'cerrada-a',
        'pieza-a',
      ]),
    );
  });

  it('y lo que bloquea a lo suyo: la duda, a quién espera esa duda y de qué depende (un salto)', () => {
    expect(contenido('HU 19565')).toEqual(
      expect.arrayContaining(['duda', 'persona', 'tarjeta-b']),
    );
    expect(contenido('HU 19565')).not.toContain('hija-de-b');
  });

  it('las ramas no son página ni contenido: son el color (la leyenda las explica)', () => {
    paginas.forEach(({ nodos: ids }) => expect(ids).not.toContain('rama-azul'));
  });

  it('«Sin HU» junta lo que ninguna HU trae', () => {
    expect(contenido(PAGINA_SIN_HU)).toEqual(['nota-suelta']);
  });

  it('la misma regla en «Sin HU»: una tarjeta suelta trae lo que necesita, a un salto (la madre con sus hijas de otras HU)', () => {
    const conMadre = calcularPaginas(
      [...nodos, nodo('madre', TIPO_NODO.TAREA)],
      [
        ...conexiones,
        conexion('madre', DEPENDE_DE, 'tarjeta-a'),
        conexion('madre', DEPENDE_DE, 'tarjeta-b'),
      ],
    );
    const sinHu = conMadre.find(({ id }) => id === PAGINA_SIN_HU);
    expect([...(sinHu?.nodos ?? [])].sort()).toEqual([
      'madre',
      'nota-suelta',
      'tarjeta-a',
      'tarjeta-b',
    ]);
    // Las hijas siguen en la página de su HU.
    expect(conMadre[0].nodos).toContain('tarjeta-a');
  });

  it('cuenta las tareas abiertas de cada página (para la pestaña)', () => {
    expect(pagina('HU 19565')?.abiertas).toBe(3);
    expect(pagina('HU 20379')?.abiertas).toBe(2);
  });

  it('dice lo que frena (el filtro 4): la duda, a quién espera y la tarea de la que se depende, no solo las dudas (Freddy, 2026-10-18)', () => {
    expect([...(pagina('HU 19565')?.frenan ?? [])].sort()).toEqual([
      'duda',
      'persona',
      'tarjeta-b',
    ]);
    expect(pagina('HU 20379')?.frenan).toEqual([]);
  });

  it('depender de algo ya mergeado no frena: las FASE dicen «Dependencias: FASE N mergeada» (Freddy, 2026-10-21)', () => {
    const [hu] = calcularPaginas(
      [
        nodo('HU', TIPO_NODO.HISTORIA),
        nodo('fase-18', TIPO_NODO.FASE),
        nodo('fase-38', TIPO_NODO.FASE, EstadoNodo.ABIERTO, Cara.REAL, [
          'producto',
          'mergeada',
        ]),
        nodo('fase-41', TIPO_NODO.FASE),
      ],
      [
        conexion('fase-18', PERTENECE_A, 'HU'),
        conexion('fase-38', PERTENECE_A, 'HU'),
        conexion('fase-41', PERTENECE_A, 'HU'),
        conexion('fase-18', DEPENDE_DE, 'fase-38'),
        conexion('fase-41', DEPENDE_DE, 'fase-18'),
      ],
    );
    expect(hu?.frenan).toEqual(['fase-18']);
  });

  it('depender de una tarjeta en APROBADO (mergeada) no frena: la etiqueta la lleva su FASE, no la tarjeta (21-10)', () => {
    const [hu] = calcularPaginas(
      [
        nodo('HU', TIPO_NODO.HISTORIA),
        nodo(
          '[25325]',
          TIPO_NODO.TAREA,
          EstadoNodo.ABIERTO,
          Cara.REAL,
          ['board'],
          'APROBADO',
        ),
        nodo('[26998]', TIPO_NODO.TAREA),
      ],
      [
        conexion('[25325]', PERTENECE_A, 'HU'),
        conexion('[26998]', PERTENECE_A, 'HU'),
        conexion('[26998]', DEPENDE_DE, '[25325]'),
      ],
    );
    expect(hu?.frenan).toEqual([]);
  });

  it('lo cerrado no frena, ni frena a lo cerrado', () => {
    const conCerradas = calcularPaginas(
      [
        nodo('HU 1', TIPO_NODO.HISTORIA),
        nodo('abierta', TIPO_NODO.TAREA),
        nodo('cerrada', TIPO_NODO.TAREA, EstadoNodo.CERRADO),
        nodo('duda-contestada', TIPO_NODO.DUDA, EstadoNodo.CERRADO),
        nodo('cimiento', TIPO_NODO.TAREA),
      ],
      [
        conexion('abierta', PERTENECE_A, 'HU 1'),
        conexion('cerrada', PERTENECE_A, 'HU 1'),
        conexion('abierta', BLOQUEADA_POR, 'duda-contestada'),
        conexion('cerrada', DEPENDE_DE, 'cimiento'),
      ],
    );
    expect(conCerradas[0].frenan).toEqual([]);
  });

  it('sin nada suelto no hay página «Sin HU», y un ciclo de pertenencias no la cuelga', () => {
    const conCiclo = calcularPaginas(
      [
        nodo('HU 1', TIPO_NODO.HISTORIA),
        nodo('x', TIPO_NODO.TAREA),
        nodo('y', TIPO_NODO.TAREA),
      ],
      [
        conexion('x', PERTENECE_A, 'HU 1'),
        conexion('y', PERTENECE_A, 'x'),
        conexion('x', PERTENECE_A, 'y'),
      ],
    );
    expect(conCiclo.map(({ id }) => id)).toEqual(['HU 1']);
    expect([...conCiclo[0].nodos].sort()).toEqual(['HU 1', 'x', 'y']);
  });
});

describe('calcularPaginas — las dos caras de cada HU (FASE 17): lo real y el plan', () => {
  const { PLAN } = Cara;
  const { ABIERTO } = EstadoNodo;
  const paginas = calcularPaginas(
    [
      ...nodos,
      nodo('pieza-plan', TIPO_NODO.TAREA, ABIERTO, PLAN),
      nodo('hija-plan', TIPO_NODO.TAREA, ABIERTO, PLAN),
      nodo('plan-en-fase', TIPO_NODO.TAREA, ABIERTO, PLAN),
      nodo('plan-suelto', TIPO_NODO.TAREA, ABIERTO, PLAN),
    ],
    [
      ...conexiones,
      conexion('pieza-plan', PERTENECE_A, 'HU 20379'),
      conexion('hija-plan', PERTENECE_A, 'pieza-plan'),
      conexion('plan-en-fase', PERTENECE_A, 'fase-b'),
      conexion('pieza-plan', DEPENDE_DE, 'tarjeta-a'),
    ],
  );
  const pagina = (id: string) => paginas.find((p) => p.id === id);
  const contenido = (id: string) => [...(pagina(id)?.nodos ?? [])].sort();
  const planDe20379 = paginaDelPlan('HU 20379');

  it('la HU con plan tiene dos páginas seguidas del mismo libro, primero la real; sin plan, solo la real', () => {
    expect(paginas.map(({ id, libro, cara }) => ({ id, libro, cara }))).toEqual(
      [
        { id: 'HU 19565', libro: 'HU 19565', cara: Cara.REAL },
        { id: 'HU 20379', libro: 'HU 20379', cara: Cara.REAL },
        { id: planDe20379, libro: 'HU 20379', cara: PLAN },
        { id: PAGINA_SIN_HU, libro: PAGINA_SIN_HU, cara: Cara.REAL },
        { id: paginaDelPlan(PAGINA_SIN_HU), libro: PAGINA_SIN_HU, cara: PLAN },
      ],
    );
    expect(pagina(planDe20379)).toMatchObject({
      titulo: 'HU 20379',
      historiaId: 'HU 20379',
    });
  });

  it('lo real no trae nada del plan, ni lo que cuelga de una FASE real', () => {
    expect(contenido('HU 20379')).toEqual([
      'HU 20379',
      'fase-b',
      'hija-de-b',
      'tarjeta-b',
    ]);
  });

  it('el plan trae la HU, sus piezas (aunque cuelguen de una FASE) y lo que cuelga de ellas; lo que necesitan cruza de cara, a un salto', () => {
    expect(contenido(planDe20379)).toEqual([
      'HU 20379',
      'hija-plan',
      'pieza-plan',
      'plan-en-fase',
      'tarjeta-a',
    ]);
    expect(pagina(planDe20379)?.abiertas).toBe(4);
  });

  it('una pieza del plan sin HU va a «Sin HU · plan», no a «Sin HU»', () => {
    expect(contenido(PAGINA_SIN_HU)).toEqual(['nota-suelta']);
    expect(contenido(paginaDelPlan(PAGINA_SIN_HU))).toEqual(['plan-suelto']);
  });
});

describe('calcularPaginas — una duda vive en una sola cara: la de lo real gana (Freddy, 2026-10-19)', () => {
  const { PLAN } = Cara;
  const { ABIERTO } = EstadoNodo;
  const paginas = calcularPaginas(
    [
      nodo('HU 20379', TIPO_NODO.HISTORIA),
      nodo('mi-pbi', TIPO_NODO.TAREA),
      nodo('pieza-plan', TIPO_NODO.TAREA, ABIERTO, PLAN),
      nodo('duda-de-mi-pbi', TIPO_NODO.DUDA),
      nodo('duda-del-plan', TIPO_NODO.DUDA),
      nodo('carabantes', TIPO_NODO.PERSONA),
      nodo('graciany', TIPO_NODO.PERSONA),
    ],
    [
      conexion('mi-pbi', PERTENECE_A, 'HU 20379'),
      conexion('pieza-plan', PERTENECE_A, 'HU 20379'),
      conexion('mi-pbi', BLOQUEADA_POR, 'duda-de-mi-pbi'),
      conexion('pieza-plan', BLOQUEADA_POR, 'duda-de-mi-pbi'),
      conexion('duda-de-mi-pbi', ESPERA_RESPUESTA_DE, 'carabantes'),
      conexion('pieza-plan', BLOQUEADA_POR, 'duda-del-plan'),
      conexion('duda-del-plan', ESPERA_RESPUESTA_DE, 'graciany'),
    ],
  );
  const contenido = (id: string) =>
    [...(paginas.find((p) => p.id === id)?.nodos ?? [])].sort();

  it('la duda que destraba lo real se ve en lo real, aunque también frene una pieza del plan', () => {
    expect(contenido('HU 20379')).toEqual([
      'HU 20379',
      'carabantes',
      'duda-de-mi-pbi',
      'mi-pbi',
    ]);
  });

  it('el plan muestra solo sus propias dudas: la de lo real no se repite, ni a quién espera', () => {
    expect(contenido(paginaDelPlan('HU 20379'))).toEqual([
      'HU 20379',
      'duda-del-plan',
      'graciany',
      'pieza-plan',
    ]);
  });
});

describe('calcularPaginas — la duda va en la cara de quien es dueña (Freddy, 2026-10-19: «el plan quedó sin dudas»)', () => {
  const { PLAN } = Cara;
  const { ABIERTO } = EstadoNodo;
  const paginas = calcularPaginas(
    [
      nodo('HU 20379', TIPO_NODO.HISTORIA),
      nodo('mi-pbi', TIPO_NODO.TAREA),
      nodo('pieza-plan', TIPO_NODO.TAREA, ABIERTO, PLAN),
      nodo('duda-de-la-pieza', TIPO_NODO.DUDA),
      nodo('carabantes', TIPO_NODO.PERSONA),
    ],
    [
      conexion('mi-pbi', PERTENECE_A, 'HU 20379'),
      conexion('pieza-plan', PERTENECE_A, 'HU 20379'),
      conexion('mi-pbi', DEPENDE_DE, 'pieza-plan'),
      conexion('duda-de-la-pieza', PERTENECE_A, 'pieza-plan'),
      conexion('pieza-plan', BLOQUEADA_POR, 'duda-de-la-pieza'),
      conexion('mi-pbi', BLOQUEADA_POR, 'duda-de-la-pieza'),
      conexion('duda-de-la-pieza', ESPERA_RESPUESTA_DE, 'carabantes'),
    ],
  );
  const contenido = (id: string) =>
    [...(paginas.find((p) => p.id === id)?.nodos ?? [])].sort();

  it('una duda que pertenece a una pieza del plan se ve en el plan, aunque también frene lo real', () => {
    expect(contenido(paginaDelPlan('HU 20379'))).toEqual([
      'HU 20379',
      'carabantes',
      'duda-de-la-pieza',
      'pieza-plan',
    ]);
  });

  it('lo real muestra la pieza de la que depende, no la duda ajena', () => {
    expect(contenido('HU 20379')).toEqual(['HU 20379', 'mi-pbi', 'pieza-plan']);
  });
});
