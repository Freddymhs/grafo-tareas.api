import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { TipoNodo } from '@prisma/client';
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
    ctx.app = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TodoistClient)
      .useValue(todoistFalso)
      .compile();
    await ctx.app.init();
    ctx.prisma = ctx.app.get(PrismaService);
    ctx.importador = ctx.app.get(ImportadorTodoistService);
    await ctx.prisma.conexion.deleteMany();
    await ctx.prisma.nodo.deleteMany();
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
});
