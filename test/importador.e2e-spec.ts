import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Cara, TipoNodo } from '@prisma/client';
import { AreaService } from './../src/modules/area/area.service';
import { NodosService } from './../src/modules/nodos/nodos.service';
import { PulidoService } from './../src/modules/pulido/pulido.service';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { ImportadorTodoistService } from './../src/importadores/todoist/importador-todoist.service';
import { TodoistClient } from './../src/importadores/todoist/todoist.client';
import {
  SeccionTodoist,
  TareaTodoist,
} from './../src/importadores/todoist/traducir';

const FIXTURES = join(__dirname, 'fixtures/todoist');
const leer = <T>(archivo: string): T =>
  JSON.parse(readFileSync(join(FIXTURES, archivo), 'utf8')) as T;
const tareas = leer<TareaTodoist[]>('tasks.json');
const secciones = leer<SeccionTodoist[]>('sections.json');

/** Todoist de mentira: el fixture real, sin red. */
const todoistFalso = {
  tareas: () => Promise.resolve(tareas),
  secciones: () => Promise.resolve(secciones),
};

describe('Importador Todoist (e2e, contra la base de test)', () => {
  // Lo llena beforeAll una sola vez: un holder en vez de `let` (regla §0).
  const ctx = {} as {
    app: TestingModule;
    prisma: PrismaService;
    importador: ImportadorTodoistService;
  };

  beforeAll(async () => {
    // El área del fixture: las personas salen de su refs.yaml, no del código (D6).
    const config = {
      get: (clave: string) =>
        clave === 'REFS_ARCHIVO' ? join(FIXTURES, 'refs.yaml') : undefined,
    } as unknown as ConfigService;
    ctx.app = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TodoistClient)
      .useValue(todoistFalso)
      .overrideProvider(AreaService)
      .useValue(new AreaService(config))
      .compile();
    await ctx.app.init();
    ctx.prisma = ctx.app.get(PrismaService);
    ctx.importador = ctx.app.get(ImportadorTodoistService);
    await ctx.prisma.conexion.deleteMany();
    await ctx.prisma.nodo.deleteMany();
    await ctx.prisma.descarte.deleteMany();
    await ctx.prisma.cambio.deleteMany();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('--seco traduce y cuenta sin escribir nada', async () => {
    const resumen = await ctx.importador.importar('P1', true);

    expect(resumen.tareasLeidas).toBe(tareas.length);
    expect(resumen.nodos.nuevos).toBeGreaterThan(tareas.length);
    expect(await ctx.prisma.nodo.count()).toBe(0);
  });

  it('la primera corrida crea todo; la segunda no duplica ni reescribe nada (C3, D8)', async () => {
    const primera = await ctx.importador.importar('P1', false);
    expect(primera.nodos.actualizados).toBe(0);
    expect(primera.conexiones.existentes).toBe(0);
    const nodosTrasPrimera = await ctx.prisma.nodo.count();
    const conexionesTrasPrimera = await ctx.prisma.conexion.count();
    expect(nodosTrasPrimera).toBe(primera.nodos.nuevos);
    expect(conexionesTrasPrimera).toBe(primera.conexiones.nuevas);
    // FASE 15: la fecha de creación de la tarjeta queda como su fecha de origen; la que no la trae, igual tiene fecha.
    const conFecha = await ctx.prisma.nodo.findFirstOrThrow({
      where: { externoId: '6hgwQh9G3P94qR3Q' },
      select: { fechaOrigen: true },
    });
    expect(conFecha.fechaOrigen.toISOString()).toBe('2026-10-14T19:50:39.673Z');
    const sinFecha = await ctx.prisma.nodo.findFirstOrThrow({
      where: { externoId: '6hgwQh9QqF3v7Pfx' },
      select: { fechaOrigen: true, createdAt: true },
    });
    expect(
      Math.abs(sinFecha.fechaOrigen.getTime() - sinFecha.createdAt.getTime()),
    ).toBeLessThan(5_000);

    const fechas = async () =>
      (
        await ctx.prisma.nodo.findMany({
          select: { id: true, updatedAt: true },
        })
      )
        .map(({ id, updatedAt }) => `${id}@${updatedAt.toISOString()}`)
        .sort();
    const antes = await fechas();
    const segunda = await ctx.importador.importar('P1', false);
    expect(segunda.nodos.nuevos).toBe(0);
    // Nada cambió en la fuente: no se reescribe nada, y updatedAt sigue diciendo cuándo cambió de verdad (FASE 10).
    expect(segunda.nodos.actualizados).toBe(0);
    expect(await fechas()).toEqual(antes);
    expect(segunda.conexiones.nuevas).toBe(0);
    expect(await ctx.prisma.nodo.count()).toBe(nodosTrasPrimera);
    expect(await ctx.prisma.conexion.count()).toBe(conexionesTrasPrimera);
  });

  it('--seco cuenta contra la base: tras importar dice 0 nuevos; un cambio a mano se cuenta y no se pisa', async () => {
    const nodos = await ctx.prisma.nodo.count();
    const sinCambios = await ctx.importador.importar('P1', true);
    expect(sinCambios.nodos.nuevos).toBe(0);
    expect(sinCambios.nodos.actualizados).toBe(0);
    expect(sinCambios.conexiones.nuevas).toBe(0);

    const tarea = await ctx.prisma.nodo.findFirstOrThrow({
      where: { tipo: TipoNodo.TAREA },
    });
    await ctx.prisma.nodo.update({
      where: { id: tarea.id },
      data: { titulo: 'tocado a mano' },
    });
    const conUnCambio = await ctx.importador.importar('P1', true);
    expect(conUnCambio.nodos.actualizados).toBe(1);
    const despues = await ctx.prisma.nodo.findUniqueOrThrow({
      where: { id: tarea.id },
    });
    expect(despues.titulo).toBe('tocado a mano');
    expect(await ctx.prisma.nodo.count()).toBe(nodos);

    await ctx.importador.importar('P1', false);
  });

  it('lo importado se ve por el dominio: la rama 🟢 existe con su color y Tomás es una PERSONA', async () => {
    const rama = await ctx.prisma.nodo.findUnique({
      where: {
        externoOrigen_externoId: {
          externoOrigen: 'todoist',
          externoId: 'rama:🟢',
        },
      },
    });
    expect(rama).toMatchObject({ tipo: TipoNodo.RAMA, color: '#22c55e' });
    const personas = await ctx.prisma.nodo.count({
      where: { tipo: TipoNodo.PERSONA },
    });
    expect(personas).toBe(1);
  });

  it('lo pulido en el grafo manda (FASE 16): un descarte no revive y una edición no se pisa', async () => {
    await ctx.importador.importar('P1', false);
    const [aDescartar, aEditar] = await ctx.prisma.nodo.findMany({
      where: { externoOrigen: 'todoist', tipo: TipoNodo.TAREA },
      orderBy: { externoId: 'asc' },
      take: 2,
    });
    await ctx.app
      .get(PulidoService)
      .descartar(aDescartar.id, 'prueba: sin contenido');
    await ctx.app.get(NodosService).update(aEditar.id, {
      titulo: 'Editado en el grafo',
      motivo: 'más claro',
    });

    const otra = await ctx.importador.importar('P1', false);

    expect(otra.nodos.descartados).toBe(1);
    expect(otra.nodos.nuevos).toBe(0);
    expect(
      await ctx.prisma.nodo.count({
        where: { externoId: aDescartar.externoId },
      }),
    ).toBe(0);
    const editado = await ctx.prisma.nodo.findUniqueOrThrow({
      where: { id: aEditar.id },
    });
    expect(editado.titulo).toBe('Editado en el grafo');
  });

  it('la cara la da el proyecto (FASE 17): el Draft entra al plan, al pasar a TRABAJO vuelve a lo real, y lo movido en el grafo no se pisa', async () => {
    const tareasEn = (cara: Cara) =>
      ctx.prisma.nodo.count({
        where: { externoOrigen: 'todoist', tipo: TipoNodo.TAREA, cara },
      });
    await ctx.importador.importar('DRAFT', false, Cara.PLAN);
    const total = await ctx.prisma.nodo.count({
      where: { externoOrigen: 'todoist', tipo: TipoNodo.TAREA },
    });
    expect(total).toBeGreaterThan(0);
    expect(await tareasEn(Cara.PLAN)).toBe(total);
    // Lo sintetizado (HU, ramas, personas) es de todos: no es plan.
    expect(
      await ctx.prisma.nodo.count({
        where: { tipo: { not: TipoNodo.TAREA }, cara: Cara.PLAN },
      }),
    ).toBe(0);

    const movida = await ctx.prisma.nodo.findFirstOrThrow({
      where: { externoOrigen: 'todoist', tipo: TipoNodo.TAREA },
      orderBy: { externoId: 'asc' },
    });
    await ctx.app.get(NodosService).update(movida.id, {
      cara: Cara.REAL,
      motivo: 'ya es trabajo',
    });
    await ctx.importador.importar('DRAFT', false, Cara.PLAN);
    expect(
      (await ctx.prisma.nodo.findUniqueOrThrow({ where: { id: movida.id } }))
        .cara,
    ).toBe(Cara.REAL);
    expect(await tareasEn(Cara.PLAN)).toBe(total - 1);

    await ctx.importador.importar('TRABAJO', false);
    expect(await tareasEn(Cara.REAL)).toBe(total);
  });
});
