import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { ImportadorFasesService } from './../src/importadores/fases/importador-fases.service';
import { origenFases } from './../src/importadores/fases/traducir-fases';
import { ORIGEN_TRACKER, externoHistoria } from './../src/importadores/plan';

const FIXTURES = join(__dirname, 'fixtures/fases');
const PROYECTO = 'prueba';
const ORIGEN = origenFases(PROYECTO);
const OPCIONES = {
  backlog: join(FIXTURES, 'backlog'),
  tareas: join(FIXTURES, 'Tareas'),
  roles: join(FIXTURES, 'roles.yaml'),
  adoptar: null,
  padres: null,
  proyecto: PROYECTO,
  seco: false,
  podar: false,
};
const FASES_EN_FIXTURE = 5;
const ABIERTOS_EN_FIXTURE = 2;
/** FASE 3 (lista para PR, cierre sin tildar) y FASE 4 (cierre completo): un trámite cada una (FASE 10). */
const TRAMITES_EN_FIXTURE = 2;

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

  it('crea las FASE con su etapa y la etiqueta de su rol, no toca la FASE 2 de Todoist y conecta las dudas a su tarjeta', async () => {
    const resumen = await ctx.importador.importar(OPCIONES);
    expect(resumen.nodos).toEqual({
      nuevos: FASES_EN_FIXTURE + ABIERTOS_EN_FIXTURE + TRAMITES_EN_FIXTURE,
      actualizados: 0,
    });
    // DEPENDE_DE: 2→1, 3→2, 4→3, 5→2 (la FASE 9 citada no está en el directorio) + BLOQUEADA_POR por cada ABIERTO
    // + PERTENECE_A de cada trámite a su FASE
    expect(resumen.conexiones.nuevas).toBe(
      4 + ABIERTOS_EN_FIXTURE + TRAMITES_EN_FIXTURE,
    );
    expect(resumen.dudasSueltas).toBe(0);

    const fases = await ctx.prisma.nodo.findMany({
      where: { tipo: TipoNodo.FASE, externoOrigen: ORIGEN },
      orderBy: { titulo: 'asc' },
    });
    expect(
      fases.map(({ titulo, etapa, estado, etiquetas }) => [
        titulo,
        etapa,
        estado,
        etiquetas,
      ]),
    ).toEqual([
      [
        'FASE 1 · Entendiendo',
        'ENTENDIMIENTO',
        EstadoNodo.ABIERTO,
        ['producto'],
      ],
      [
        'FASE 2 · En Codigo · 24972',
        'EN CODIGO',
        EstadoNodo.ABIERTO,
        ['producto'],
      ],
      ['FASE 3 · Lista', 'LISTO PARA PR', EstadoNodo.ABIERTO, ['producto']],
      ['FASE 4 · Cerrada', 'CERRADO', EstadoNodo.CERRADO, ['producto']],
      ['FASE 5 · Calidad', 'CAMBIAR 🧰', EstadoNodo.ABIERTO, ['calidad']],
    ]);
    const deTodoist = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: 'todoist',
          externoId: 'fase:2',
        },
      },
    });
    const tramites = await ctx.prisma.nodo.findMany({
      where: { externoOrigen: ORIGEN, externoId: { startsWith: 'tramite:' } },
      orderBy: { externoId: 'asc' },
    });
    expect(tramites.map(({ titulo, estado }) => [titulo, estado])).toEqual([
      ['FASE 3: falta URL commit, Evidencias, Wiki', EstadoNodo.ABIERTO],
      ['FASE 4: cierre oficial completo', EstadoNodo.CERRADO],
    ]);
    expect(deTodoist.etapa).toBeNull(); // intacta: puede ser la FASE 2 de otro orquestador

    const tarea = await ctx.prisma.nodo.findFirstOrThrow({
      where: { titulo: { startsWith: '[25699]' } },
    });
    const bloqueos = await ctx.prisma.conexion.count({
      where: { origenId: tarea.id, tipo: TipoConexion.BLOQUEADA_POR },
    });
    expect(bloqueos).toBe(ABIERTOS_EN_FIXTURE);
  });

  it('--seco cuenta contra la base: tras importar dice 0 nuevos y no escribe', async () => {
    const nodos = await ctx.prisma.nodo.count();
    const seco = await ctx.importador.importar({ ...OPCIONES, seco: true });
    expect(seco.nodos.nuevos).toBe(0);
    expect(seco.conexiones.nuevas).toBe(0);
    expect(await ctx.prisma.nodo.count()).toBe(nodos);
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

  it('al tildar el cierre en la FASE y reimportar, su trámite se cierra solo', async () => {
    const backlog = join(mkdtempSync(join(tmpdir(), 'backlog-')), 'backlog');
    cpSync(OPCIONES.backlog, backlog, { recursive: true });
    const archivo = join(backlog, 'FASE_3_LISTA.md');
    const tildado = readFileSync(archivo, 'utf8')
      .replace('- [ ] URL commit', '- [x] URL commit')
      .replace('- [ ] Evidencias', '- [x] Evidencias')
      .replace('- [ ] Wiki actualizada', '- [x] Wiki actualizada');
    writeFileSync(archivo, tildado);
    await ctx.importador.importar({ ...OPCIONES, backlog, tareas: null });
    const tramite = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: ORIGEN,
          externoId: 'tramite:fase:3',
        },
      },
    });
    expect([tramite.titulo, tramite.estado]).toEqual([
      'FASE 3: cierre oficial completo',
      EstadoNodo.CERRADO,
    ]);
  });

  it('con --adoptar todoist, la «FASE 2» de Todoist pasa a este proyecto: mismo nodo, sus conexiones, sin duplicar', async () => {
    const deTodoist = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: 'todoist',
          externoId: 'fase:2',
        },
      },
    });
    const tarea = await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.TAREA, titulo: 'tarea de la FASE 2' },
    });
    await ctx.prisma.conexion.create({
      data: {
        origenId: tarea.id,
        destinoId: deTodoist.id,
        tipo: TipoConexion.PERTENECE_A,
      },
    });
    const resumen = await ctx.importador.importar({
      ...OPCIONES,
      proyecto: 'sag',
      tareas: null,
      adoptar: 'todoist',
    });
    expect(resumen.adoptadas).toBe(1);
    const adoptada = await ctx.prisma.nodo.findUniqueOrThrow({
      where: { id: deTodoist.id },
      include: { entrantes: true },
    });
    expect(adoptada.externoOrigen).toBe(origenFases('sag'));
    expect(adoptada.titulo).toContain('FASE 2 · En Codigo');
    expect(adoptada.entrantes.map(({ origenId }) => origenId)).toContain(
      tarea.id,
    );
    const fase2DeSag = await ctx.prisma.nodo.count({
      where: { externoOrigen: origenFases('sag'), externoId: 'fase:2' },
    });
    expect(fase2DeSag).toBe(1);
  });

  it('si Todoist se reimporta y su «FASE 2» reaparece, adoptar la fusiona con la propia: un nodo, sus conexiones pasan sin duplicarse', async () => {
    const propia = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: origenFases('sag'),
          externoId: 'fase:2',
        },
      },
      include: { entrantes: true },
    });
    const yaConectada = propia.entrantes[0].origenId;
    const copia = await ctx.prisma.nodo.create({
      data: {
        tipo: TipoNodo.FASE,
        titulo: 'FASE 2',
        externoOrigen: 'todoist',
        externoId: 'fase:2',
      },
    });
    const tareaReimportada = await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.TAREA, titulo: 'tarea reimportada de la FASE 2' },
    });
    await ctx.prisma.conexion.createMany({
      data: [tareaReimportada.id, yaConectada].map((origenId) => ({
        origenId,
        destinoId: copia.id,
        tipo: TipoConexion.PERTENECE_A,
      })),
    });

    const resumen = await ctx.importador.importar({
      ...OPCIONES,
      proyecto: 'sag',
      tareas: null,
      adoptar: 'todoist',
    });

    expect(resumen.adoptadas).toBe(1);
    expect(
      await ctx.prisma.nodo.findUnique({ where: { id: copia.id } }),
    ).toBeNull();
    const entrantes = await ctx.prisma.conexion.findMany({
      where: { destinoId: propia.id, tipo: TipoConexion.PERTENECE_A },
    });
    const origenes = entrantes.map(({ origenId }) => origenId);
    expect(origenes).toContain(tareaReimportada.id);
    expect(origenes.filter((id) => id === yaConectada)).toHaveLength(1);
  });
  it('FASE 13: con --padres la FASE cuelga de su HU (título real) y la tarjeta que cita su task, de la FASE', async () => {
    const padres = join(mkdtempSync(join(tmpdir(), 'padres-')), 'padres.json');
    writeFileSync(
      padres,
      JSON.stringify({
        tareas: { '24972': '19565' },
        padres: { '19565': 'Registrar Toma de Muestras' },
      }),
    );
    const tarjeta = await ctx.prisma.nodo.create({
      data: {
        tipo: TipoNodo.TAREA,
        titulo: '[24972] Backend - exponer mezclas',
      },
    });
    const otraTask = await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.TAREA, titulo: 'cita la 249721, que es otra' },
    });
    const opciones = { ...OPCIONES, tareas: null, padres };

    const resumen = await ctx.importador.importar(opciones);

    expect(resumen.tarjetasEnganchadas).toBe(1);
    const hu = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: {
          externoOrigen: ORIGEN_TRACKER,
          externoId: externoHistoria('19565'),
        },
      },
    });
    expect(hu).toMatchObject({
      tipo: TipoNodo.HISTORIA,
      titulo: 'HU 19565 · Registrar Toma de Muestras',
    });
    const fase2 = await ctx.prisma.nodo.findUniqueOrThrow({
      where: {
        externoOrigen_externoId: { externoOrigen: ORIGEN, externoId: 'fase:2' },
      },
    });
    const pertenece = (origenId: string, destinoId: string) =>
      ctx.prisma.conexion.count({
        where: { origenId, destinoId, tipo: TipoConexion.PERTENECE_A },
      });
    expect(await pertenece(fase2.id, hu.id)).toBe(1);
    expect(await pertenece(tarjeta.id, fase2.id)).toBe(1);
    expect(await pertenece(otraTask.id, fase2.id)).toBe(0);

    const segunda = await ctx.importador.importar(opciones);
    expect(segunda.tarjetasEnganchadas).toBe(0);
  });

  it('A.1: una dependencia entre FASE que ningún .md declara se informa; solo con --podar se borra (Freddy, 2026-10-21)', async () => {
    const fase = (numero: number) =>
      ctx.prisma.nodo.findUniqueOrThrow({
        where: {
          externoOrigen_externoId: {
            externoOrigen: ORIGEN,
            externoId: `fase:${numero}`,
          },
        },
      });
    const [uno, dos, tres] = await Promise.all([fase(1), fase(2), fase(3)]);
    await ctx.prisma.conexion.create({
      data: {
        origenId: uno.id,
        destinoId: tres.id,
        tipo: TipoConexion.DEPENDE_DE,
      },
    });
    const vieja = { origenId: uno.id, destinoId: tres.id };
    const declarada = { origenId: tres.id, destinoId: dos.id };

    const informa = await ctx.importador.importar(OPCIONES);
    expect(informa.dependenciasViejas).toEqual(['fase:1 → fase:3']);
    expect(informa.dependenciasPodadas).toBe(0);
    expect(await ctx.prisma.conexion.count({ where: vieja })).toBe(1);

    const poda = await ctx.importador.importar({ ...OPCIONES, podar: true });
    expect(poda.dependenciasPodadas).toBe(1);
    expect(await ctx.prisma.conexion.count({ where: vieja })).toBe(0);
    expect(await ctx.prisma.conexion.count({ where: declarada })).toBe(1);
  });
});
