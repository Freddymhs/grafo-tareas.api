import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
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
});
