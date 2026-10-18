import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Cara, EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { externoCarril } from '../pieza';
import { ORIGEN_TRACKER, externoHistoria } from '../plan';
import {
  externoFase,
  externoPersona,
  externoRama,
  SeccionTodoist,
  TareaTodoist,
  traducir,
} from './traducir';

const FIXTURES = join(__dirname, '../../../test/fixtures/todoist');
const leer = <T>(archivo: string): T =>
  JSON.parse(readFileSync(join(FIXTURES, archivo), 'utf8')) as T;

const tareas = leer<TareaTodoist[]>('tasks.json');
const secciones = leer<SeccionTodoist[]>('sections.json');
const ETAPAS = [
  'ENTENDIMIENTO',
  'CERRADO',
  '🔎 Precheck fin de sprint (archivadas)',
];
const plan = traducir(tareas, secciones, ETAPAS);

const tarea = (patron: RegExp) => {
  const encontrada = tareas.find(({ content }) => patron.test(content));
  if (!encontrada)
    throw new Error(`el fixture no trae una tarea que matchee ${patron}`);
  return encontrada;
};
const nodo = (externoId: string) =>
  plan.nodos.find((n) => n.externoId === externoId);
const conexionesDe = (externoId: string, tipo: TipoConexion) =>
  plan.conexiones.filter(
    (c) => c.origenExternoId === externoId && c.tipo === tipo,
  );

describe('traducir (fixture real de TRABAJO, reducido)', () => {
  it('D1 · cada tarea es un nodo TAREA con su id de Todoist y el título tal cual', () => {
    const tareasPlan = plan.nodos.filter(({ tipo }) => tipo === TipoNodo.TAREA);
    expect(tareasPlan).toHaveLength(tareas.length);
    tareas.forEach((t) => expect(nodo(t.id)?.titulo).toBe(t.content));
  });

  it('D1 · etapa, etiquetas, prioridad y fecha van a su campo (C9); la sección desconocida queda en la descripción', () => {
    // El fixture trae etiquetas `board` (no `daily`): se mira lo que hay, no lo que se supone.
    const conEtiquetas = tareas.find((t) => t.labels.length > 0);
    const enEtapa = tareas.find((t) => t.section_id !== null);
    expect(conEtiquetas).toBeDefined();
    expect(enEtapa).toBeDefined();
    expect(nodo(conEtiquetas?.id ?? '')?.etiquetas).toEqual(
      conEtiquetas?.labels,
    );
    expect(nodo(enEtapa?.id ?? '')?.etapa).not.toBeNull();
    tareas.forEach((t) => {
      const n = nodo(t.id);
      expect(n?.prioridad).toBeGreaterThanOrEqual(1);
      expect(n?.prioridad).toBeLessThanOrEqual(4);
      expect(n?.vence).toBe(t.due?.date ?? null);
      expect(n?.descripcion ?? '').not.toContain('etiquetas:');
    });
  });

  it('la fecha de creación de la tarjeta va a fechaOrigen (FASE 15); sin ella, nada (el nodo conserva la suya)', () => {
    const [conFecha, sinFecha] = tareas;
    const nodo = (id: string) =>
      plan.nodos.find(({ externoId }) => externoId === id);
    expect(nodo(conFecha.id)?.fechaOrigen).toBe('2026-10-14T19:50:39.673000Z');
    expect(nodo(sinFecha.id)?.fechaOrigen ?? null).toBeNull();
  });

  it('la cara del proyecto va a cada tarea (FASE 17); lo sintetizado es de todos y no la lleva', () => {
    const delDraft = traducir(tareas, secciones, ETAPAS, Cara.PLAN);
    const [deTareas, sintetizados] = [
      delDraft.nodos.filter(({ tipo }) => tipo === TipoNodo.TAREA),
      delDraft.nodos.filter(({ tipo }) => tipo !== TipoNodo.TAREA),
    ];
    expect(deTareas.every(({ cara }) => cara === Cara.PLAN)).toBe(true);
    expect(sintetizados.length).toBeGreaterThan(0);
    expect(sintetizados.every(({ cara }) => cara === undefined)).toBe(true);
    expect(
      plan.nodos
        .filter(({ tipo }) => tipo === TipoNodo.TAREA)
        .every(({ cara }) => cara === Cara.REAL),
    ).toBe(true);
  });

  it('D2 · CERRADO en las secciones cerradas; ABIERTO en las demás', () => {
    const porSeccion = new Map(secciones.map(({ id, name }) => [name, id]));
    const enCerrado = tareas.find(
      (t) => t.section_id === porSeccion.get('CERRADO'),
    );
    const archivada = tareas.find(
      (t) =>
        t.section_id ===
        porSeccion.get('🔎 Precheck fin de sprint (archivadas)'),
    );
    const enEntendimiento = tareas.find(
      (t) => t.section_id === porSeccion.get('ENTENDIMIENTO'),
    );
    expect(nodo(enCerrado?.id ?? '')?.estado).toBe(EstadoNodo.CERRADO);
    expect(nodo(archivada?.id ?? '')?.estado).toBe(EstadoNodo.CERRADO);
    expect(nodo(enEntendimiento?.id ?? '')?.estado).toBe(EstadoNodo.ABIERTO);
  });

  it('D3 · el padre DEPENDE_DE cada hija', () => {
    const hijas = tareas.filter((t) => t.parent_id !== null);
    expect(hijas.length).toBeGreaterThan(0);
    hijas.forEach((hija) => {
      const dependencias = conexionesDe(
        hija.parent_id ?? '',
        TipoConexion.DEPENDE_DE,
      );
      expect(dependencias.map((c) => c.destinoExternoId)).toContain(hija.id);
    });
  });

  it('D4 · una tarea con 🔵🟢 pertenece a dos ramas, y cada rama tiene su color', () => {
    const dosColores = tarea(/🔵🟢/);
    const ramas = conexionesDe(dosColores.id, TipoConexion.PERTENECE_A).map(
      (c) => c.destinoExternoId,
    );
    expect(ramas).toEqual(
      expect.arrayContaining([externoRama('🔵'), externoRama('🟢')]),
    );
    expect(nodo(externoRama('🟢'))).toMatchObject({
      tipo: TipoNodo.RAMA,
      titulo: '🟢',
      color: '#22c55e',
    });
  });

  it('D5 · "FASE 32" en el título crea el nodo FASE y la tarea le pertenece', () => {
    const conFase = tarea(/FASE 32/);
    expect(nodo(externoFase('32'))).toMatchObject({
      tipo: TipoNodo.FASE,
      titulo: 'FASE 32',
    });
    expect(
      conexionesDe(conFase.id, TipoConexion.PERTENECE_A).map(
        (c) => c.destinoExternoId,
      ),
    ).toContain(externoFase('32'));
  });

  it('C10 · con el origen de las FASE del orquestador, «FASE 32» es ESA FASE (por externo): no se duplica ni se pisa', () => {
    const conFases = traducir(
      tareas,
      secciones,
      ETAPAS,
      Cara.REAL,
      null,
      'fases-md:laboratorio',
    );
    const fase32 = conFases.nodos.find(
      (n) => n.externoId === externoFase('32'),
    );
    expect(fase32).toMatchObject({
      tipo: TipoNodo.FASE,
      origen: 'fases-md:laboratorio',
      soloSiFalta: true,
    });
    // Sin el origen, el tablero sintetiza la suya (la de siempre).
    expect(nodo(externoFase('32'))?.origen).toBeUndefined();
  });

  it('D6 · "BLOQUEO … esperando a Tomás Carabantes" espera la respuesta de UNA persona', () => {
    const bloqueos = tareas.filter((t) => /BLOQUEO (A2|Q3)/.test(t.content));
    expect(bloqueos).toHaveLength(2);
    const persona = externoPersona('Tomás Carabantes');
    bloqueos.forEach((b) => {
      expect(
        conexionesDe(b.id, TipoConexion.ESPERA_RESPUESTA_DE).map(
          (c) => c.destinoExternoId,
        ),
      ).toEqual([persona]);
    });
    expect(
      plan.nodos.filter(({ tipo }) => tipo === TipoNodo.PERSONA),
    ).toHaveLength(1);
  });

  it('D6 · «Thomas» es Tomás Soto, no Carabantes (Freddy, 2026-10-18: «backend: Thomas/Tomás Soto»)', () => {
    const base = tarea(/BLOQUEO A2/);
    const esperaDe = (content: string) =>
      traducir([{ ...base, id: 'espera', content }], secciones, ETAPAS)
        .conexiones.filter(
          ({ origenExternoId, tipo }) =>
            origenExternoId === 'espera' &&
            tipo === TipoConexion.ESPERA_RESPUESTA_DE,
        )
        .map(({ destinoExternoId }) => destinoExternoId);
    expect(esperaDe('BLOQUEO — esperando a Thomas por el esquema')).toEqual([
      externoPersona('Tomás Soto'),
    ]);
    expect(esperaDe('BLOQUEO — esperando a Tomás Soto')).toEqual([
      externoPersona('Tomás Soto'),
    ]);
    expect(esperaDe('BLOQUEO — esperando a Tomás Carabantes')).toEqual([
      externoPersona('Tomás Carabantes'),
    ]);
  });

  it('D6 · "Bloqueo sin Unidad Organizacional" es una feature, no una espera', () => {
    const feature = tarea(/\[25327\]/);
    expect(conexionesDe(feature.id, TipoConexion.ESPERA_RESPUESTA_DE)).toEqual(
      [],
    );
  });

  it('D7 · el emoji de orden queda en el título y no crea DEPENDE_DE', () => {
    const conOrden = tarea(/0️⃣/);
    expect(nodo(conOrden.id)?.titulo).toContain('0️⃣');
    expect(conexionesDe(conOrden.id, TipoConexion.DEPENDE_DE)).toEqual([]);
  });

  it('D8 · los nodos sintetizados no se repiten y toda conexión apunta a nodos del plan', () => {
    const ids = plan.nodos.map(({ externoId }) => externoId);
    expect(new Set(ids).size).toBe(ids.length);
    const conocidos = new Set(ids);
    plan.conexiones.forEach((c) => {
      expect(conocidos.has(c.origenExternoId)).toBe(true);
      expect(conocidos.has(c.destinoExternoId)).toBe(true);
    });
  });

  it('es determinista: el mismo fixture da el mismo plan', () => {
    expect(traducir(tareas, secciones, ETAPAS)).toEqual(plan);
  });

  it('FASE 15 t3 · las tarjetas de cierre oficial («falta URL commit y Evidencias») llevan la etiqueta de trámite; sin catálogo, ninguna', () => {
    const ETIQUETA = 'complemento:tramite';
    const conTramite = traducir(tareas, secciones, ETAPAS, Cara.REAL, ETIQUETA);
    const marcadas = conTramite.nodos.filter(({ etiquetas }) =>
      etiquetas.includes(ETIQUETA),
    );
    expect(marcadas.length).toBeGreaterThan(0);
    marcadas.forEach(({ titulo }) =>
      expect(titulo).toMatch(/URL commit|Evidencias|la wiki/),
    );
    const cierre = tarea(/FASE 22 .*falta URL commit/);
    expect(nodo(cierre.id)?.etiquetas).not.toContain(ETIQUETA);
    // Un trámite va a su columna, a la derecha de CERRADO, sea cual sea su sección en Todoist.
    expect(conTramite.nodos.find((n) => n.externoId === cierre.id)?.etapa).toBe(
      'TRÁMITES DE CIERRE',
    );
    expect(
      conTramite.nodos.find((n) => n.externoId === cierre.id)?.etiquetas,
    ).toContain(ETIQUETA);
    // Una feature que no habla del cierre no es trámite aunque el catálogo lo tenga.
    const feature = tarea(/Bloqueo sin Unidad Organizacional/);
    expect(
      conTramite.nodos.find((n) => n.externoId === feature.id)?.etiquetas,
    ).not.toContain(ETIQUETA);
  });
});

describe('R4 (FASE 13) · las piezas del Draft (fixture real: 3 tarjetas de la HU 20379)', () => {
  const draft = leer<TareaTodoist[]>('draft-tasks.json');
  const seccionesDraft = leer<SeccionTodoist[]>('draft-sections.json');
  const planDraft = traducir(draft, seccionesDraft, ETAPAS);
  const pieza = (patron: RegExp) => {
    const tarea = draft.find(({ content }) => patron.test(content));
    const encontrado = planDraft.nodos.find((n) => n.externoId === tarea?.id);
    if (!tarea || !encontrado) throw new Error(`falta la pieza ${patron}`);
    return encontrado;
  };
  const hacia = (externoId: string) =>
    planDraft.conexiones
      .filter(
        (c) =>
          c.origenExternoId === externoId &&
          c.tipo === TipoConexion.PERTENECE_A,
      )
      .map((c) => c.destinoExternoId);

  it('la pieza lleva las etiquetas pieza, su ronda y si está por crear o descartada', () => {
    expect(pieza(/0\.4 ·/).etiquetas).toEqual([
      'pieza',
      'ronda:2',
      'por-crear',
    ]);
    expect(pieza(/1\.3 ·/).etiquetas).toEqual([
      'pieza',
      'ronda:3',
      'descartada',
    ]);
    expect(pieza(/\[26309\]/).etiquetas).toEqual(['pieza', 'ronda:5']);
  });

  it('cuelga de su HU (la de la cabecera, aunque el título ya no la diga) y de su carril', () => {
    const tomada = pieza(/\[26309\]/);
    expect(hacia(tomada.externoId)).toEqual(
      expect.arrayContaining([
        externoHistoria('20379'),
        externoCarril('20379', 'C · Recepción'),
        externoRama('🟢'),
      ]),
    );
    expect(hacia(pieza(/1\.3 ·/).externoId)).toEqual([
      externoHistoria('20379'),
      externoCarril('20379', 'A · Bandeja'),
    ]);
  });

  it('la HU es la compartida (origen tracker) y el tablero no le pisa el título: solo la crea si falta', () => {
    const hu = planDraft.nodos.filter(({ tipo }) => tipo === TipoNodo.HISTORIA);
    expect(hu).toHaveLength(1);
    expect(hu[0]).toMatchObject({
      externoId: externoHistoria('20379'),
      titulo: 'HU 20379',
      origen: ORIGEN_TRACKER,
      soloSiFalta: true,
    });
  });

  it('cada carril es una RAMA «HU · carril» con color y la etiqueta carril (la columna del plan), una sola vez aunque tenga varias piezas', () => {
    const carriles = planDraft.nodos.filter(({ externoId }) =>
      externoId.startsWith('carril:'),
    );
    expect(carriles.map(({ titulo }) => titulo).sort()).toEqual([
      '20379 · A · Bandeja',
      '20379 · C · Recepción',
    ]);
    expect(
      carriles.every(({ tipo, color }) => tipo === TipoNodo.RAMA && color),
    ).toBe(true);
    expect(
      carriles.every(({ etiquetas }) => etiquetas.includes('carril')),
    ).toBe(true);
  });

  it('una tarea de TRABAJO sin cabecera de reparto no es pieza', () => {
    expect(
      plan.nodos.some(({ etiquetas }) => etiquetas.includes('pieza')),
    ).toBe(false);
  });
});
