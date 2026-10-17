import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { ImportadorFasesService } from './../src/importadores/fases/importador-fases.service';
import { origenFases } from './../src/importadores/fases/traducir-fases';

const FIXTURES = join(__dirname, 'fixtures/fases');
const PROYECTO = 'prueba';
const ORIGEN = origenFases(PROYECTO);
const OPCIONES = {
  backlog: join(FIXTURES, 'backlog'),
  tareas: join(FIXTURES, 'Tareas'),
  proyecto: PROYECTO,
  seco: false,
};
const FASES_EN_FIXTURE = 5;
const ABIERTOS_EN_FIXTURE = 2;

describe('Importador de FASE_*.md (e2e, contra la base de test)', () => {
  const ctx = {} as {
    app: TestingModule;
    prisma: PrismaService;
    importador: ImportadorFasesService;
  };

  beforeAll(async () => {
    ctx.app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await ctx.app.init();
    ctx.prisma = ctx.app.get(PrismaService);
    ctx.importador = ctx.app.get(ImportadorFasesService);
    await ctx.prisma.conexion.deleteMany();
    await ctx.prisma.nodo.deleteMany();
    // Lo que otro importador (Todoist) ya dejó: una «FASE 2» (que puede ser de OTRO orquestador) y la tarjeta de la task 25699.
    await ctx.prisma.nodo.create({
      data: {
        tipo: TipoNodo.FASE,
        titulo: 'FASE 2',
        externoOrigen: 'todoist',
        externoId: 'fase:2',
      },
    });
    await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.TAREA, titulo: '[25699] Feriados' },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('--seco cuenta sin escribir', async () => {
    const resumen = await ctx.importador.importar({ ...OPCIONES, seco: true });
    expect(resumen.fasesLeidas).toBe(FASES_EN_FIXTURE);
    expect(resumen.abiertosLeidos).toBe(ABIERTOS_EN_FIXTURE);
    expect(
      await ctx.prisma.nodo.count({ where: { externoOrigen: ORIGEN } }),
    ).toBe(0);
  });

  it('crea las FASE con su etapa, no toca la FASE 2 de Todoist y conecta las dudas a su tarjeta', async () => {
    const resumen = await ctx.importador.importar(OPCIONES);
    expect(resumen.nodos).toEqual({
      nuevos: FASES_EN_FIXTURE + ABIERTOS_EN_FIXTURE,
      actualizados: 0,
    });
    // DEPENDE_DE: 2→1, 3→2, 4→3, 5→2 (la FASE 9 citada no está en el directorio) + BLOQUEADA_POR por cada ABIERTO
    expect(resumen.conexiones.nuevas).toBe(4 + ABIERTOS_EN_FIXTURE);
    expect(resumen.dudasSueltas).toBe(0);

    const fases = await ctx.prisma.nodo.findMany({
      where: { tipo: TipoNodo.FASE, externoOrigen: ORIGEN },
      orderBy: { titulo: 'asc' },
    });
    expect(
      fases.map(({ titulo, etapa, estado }) => [titulo, etapa, estado]),
    ).toEqual([
      ['FASE 1', 'ENTENDIMIENTO', EstadoNodo.ABIERTO],
      ['FASE 2', 'EN CODIGO', EstadoNodo.ABIERTO],
      ['FASE 3', 'LISTO PARA PR', EstadoNodo.ABIERTO],
      ['FASE 4', 'CERRADO', EstadoNodo.CERRADO],
      ['FASE 5', 'CAMBIAR 🧰', EstadoNodo.ABIERTO],
    ]);
    const deTodoist = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: 'todoist',
          externoId: 'fase:2',
        },
      },
    });
    expect(deTodoist.etapa).toBeNull(); // intacta: puede ser la FASE 2 de otro orquestador

    const tarea = await ctx.prisma.nodo.findFirstOrThrow({
      where: { titulo: { startsWith: '[25699]' } },
    });
    const bloqueos = await ctx.prisma.conexion.count({
      where: { origenId: tarea.id, tipo: TipoConexion.BLOQUEADA_POR },
    });
    expect(bloqueos).toBe(ABIERTOS_EN_FIXTURE);
  });

  it('la segunda corrida no duplica; un ABIERTO que desaparece cierra su DUDA', async () => {
    const segunda = await ctx.importador.importar(OPCIONES);
    expect(segunda.nodos.nuevos).toBe(0);
    expect(segunda.conexiones.nuevas).toBe(0);

    // Sin --tareas no se leyó nada: las dudas siguen abiertas (omitir el flag no es "se cerraron").
    const sinTareas = await ctx.importador.importar({
      ...OPCIONES,
      tareas: null,
    });
    expect(sinTareas.dudasCerradas).toBe(0);
    const abiertas = () =>
      ctx.prisma.nodo.count({
        where: { tipo: TipoNodo.DUDA, estado: EstadoNodo.ABIERTO },
      });
    expect(await abiertas()).toBe(ABIERTOS_EN_FIXTURE);

    // Con una carpeta Tareas/ que ya no trae esos ABIERTO: se cierran.
    const tareasVacias = mkdtempSync(join(tmpdir(), 'tareas-'));
    const sinAbiertos = await ctx.importador.importar({
      ...OPCIONES,
      tareas: tareasVacias,
    });
    expect(sinAbiertos.dudasCerradas).toBe(ABIERTOS_EN_FIXTURE);
    expect(await abiertas()).toBe(0);
  });

  it('otro proyecto con las mismas FASE no pisa las de éste', async () => {
    const otro = await ctx.importador.importar({
      ...OPCIONES,
      proyecto: 'otro',
      tareas: null,
    });
    expect(otro.nodos.actualizados).toBe(0);
    expect(
      await ctx.prisma.nodo.count({
        where: { tipo: TipoNodo.FASE, externoOrigen: ORIGEN },
      }),
    ).toBe(FASES_EN_FIXTURE);
  });
});
