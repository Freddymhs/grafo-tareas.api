import { TIPO_NODO } from '../src/common/constants/tipos.constants';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Cara } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { sembrarEspacioTrabajo, vaciarBase } from './fixtures/sembrar-espacio';
import { AreaService } from './../src/modules/area/area.service';
import { RolesService } from './../src/modules/roles/roles.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface Nodo {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  descripcion: string | null;
  complemento?: string;
}

const PREFIJO = '/api/v1';
const ROLES = join(__dirname, 'fixtures/fases/roles.yaml');
const REFS = join(__dirname, 'fixtures/fases/refs.yaml');
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('Complementos (e2e) — lo que cuelga de un PBI', () => {
  const ctx = {} as {
    app: NestFastifyApplication;
    prisma: PrismaService;
    pbi: string;
    proyecto: string;
  };

  const pedir = async <T>(
    method: 'GET' | 'POST',
    url: string,
    payload?: object,
  ) => {
    const res = await ctx.app.inject({ method, url: PREFIJO + url, payload });
    return {
      status: res.statusCode,
      body: JSON.parse(res.body) as Envuelto<T>,
    };
  };
  const colgar = (tipo: string, titulo: string) =>
    pedir<Nodo>('POST', `/nodos/${ctx.pbi}/complementos`, { tipo, titulo });
  const titulos = (nodos: Nodo[]) => nodos.map(({ titulo }) => titulo).sort();

  beforeAll(async () => {
    // Los servicios de la app con los archivos de las fixtures (el ConfigModule lee el entorno al importarse).
    const entorno: Record<string, string> = {
      ROLES_ARCHIVO: ROLES,
      REFS_ARCHIVO: REFS,
    };
    const config = {
      get: (clave: string) => entorno[clave],
    } as unknown as ConfigService;
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RolesService)
      .useValue(new RolesService(config))
      .overrideProvider(AreaService)
      .useValue(new AreaService(config))
      .compile();
    ctx.app = modulo.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    ctx.app.setGlobalPrefix('api/v1');
    await ctx.app.init();
    await ctx.app.getHttpAdapter().getInstance().ready();
    ctx.prisma = ctx.app.get(PrismaService);
    await vaciarBase(ctx.prisma);
    const { proyectoSagId } = await sembrarEspacioTrabajo(ctx.prisma);
    ctx.proyecto = proyectoSagId;
    const pbi = await ctx.prisma.nodo.create({
      data: {
        tipo: TIPO_NODO.HISTORIA,
        titulo: 'PBI 25699 feriados',
        proyectoId: ctx.proyecto,
      },
    });
    ctx.pbi = pbi.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('una duda cuelga del PBI y lo frena', async () => {
    const duda = await colgar('duda-negocio', '¿Tiene que quedar aprobada?');
    expect(duda.status).toBe(201);
    expect(duda.body.data).toMatchObject({
      tipo: 'DUDA',
      complemento: 'duda-negocio',
    });
    const bloqueado = await pedir<{ bloqueado: boolean }>(
      'GET',
      `/nodos/${ctx.pbi}/bloqueado`,
    );
    expect(bloqueado.body.data.bloqueado).toBe(true);
  });

  it('una nota (apunte) no entra en «hoy puedo» ni en el tablero con notas=ocultar; un trámite sí', async () => {
    await colgar('apunte', 'feriados regionales vienen de otra API');
    await colgar('tramite', 'falta URL commit');
    const hoy = await pedir<Nodo[]>('GET', '/derivado/hoy-puedo');
    expect(titulos(hoy.body.data)).toEqual(['falta URL commit']);
    const tablero = await pedir<{ data: Nodo[] }>(
      'GET',
      '/nodos?tipo=TAREA&notas=ocultar',
    );
    expect(titulos(tablero.body.data.data)).toEqual(['falta URL commit']);
  });

  it('GET /nodos/:id/complementos trae todo lo que cuelga, con su clave', async () => {
    const lista = await pedir<Nodo[]>('GET', `/nodos/${ctx.pbi}/complementos`);
    expect(lista.body.data.map(({ complemento }) => complemento)).toEqual([
      'duda-negocio',
      'apunte',
      'tramite',
    ]);
  });

  it('un bloqueante en una sola llamada: espera a su persona, nace en la cara de su dueño y con su prioridad (Freddy, 2026-10-19)', async () => {
    const persona = await ctx.prisma.nodo.create({
      data: {
        tipo: TIPO_NODO.PERSONA,
        titulo: 'Carabantes',
        proyectoId: ctx.proyecto,
      },
    });
    const pieza = await ctx.prisma.nodo.create({
      data: {
        tipo: TIPO_NODO.TAREA,
        titulo: '3.1 · Iniciar',
        cara: Cara.PLAN,
        proyectoId: ctx.proyecto,
      },
    });
    const res = await pedir<Nodo & { cara: string; prioridad: number }>(
      'POST',
      `/nodos/${pieza.id}/complementos`,
      {
        tipo: 'duda-negocio',
        titulo: 'Para Carabantes: ¿dos recepcionistas a la vez?',
        personaId: persona.id,
        prioridad: 1,
      },
    );
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ cara: 'PLAN', prioridad: 1 });
    const conexiones = await ctx.prisma.conexion.findMany({
      where: {
        OR: [{ origenId: res.body.data.id }, { destinoId: res.body.data.id }],
      },
    });
    expect(conexiones.map(({ tipo }) => tipo).sort()).toEqual([
      'BLOQUEADA_POR',
      'ESPERA_RESPUESTA_DE',
      'PERTENECE_A',
    ]);
  });

  it('una persona que no existe es 404 y no deja nada a medias; algo que no es una persona, 400', async () => {
    const antes = await ctx.prisma.nodo.count();
    const sinPersona = await pedir('POST', `/nodos/${ctx.pbi}/complementos`, {
      tipo: 'duda-negocio',
      titulo: 'x',
      personaId: UUID_INEXISTENTE,
    });
    expect(sinPersona.status).toBe(404);
    expect(await ctx.prisma.nodo.count()).toBe(antes);
    const noEsPersona = await pedir('POST', `/nodos/${ctx.pbi}/complementos`, {
      tipo: 'duda-negocio',
      titulo: 'x',
      personaId: ctx.pbi,
    });
    expect(noEsPersona.status).toBe(400);
  });

  it('un tipo fuera del catálogo es 400; un padre que no existe, 404', async () => {
    expect((await colgar('chisme', 'x')).status).toBe(400);
    const sinPadre = await pedir(
      'POST',
      `/nodos/${UUID_INEXISTENTE}/complementos`,
      { tipo: 'apunte', titulo: 'x' },
    );
    expect(sinPadre.status).toBe(404);
  });

  it('escalar sigue la escalera del área, deja el rastro y se frena al final', async () => {
    const duda = await colgar('duda-negocio', '¿Feriados regionales?');
    const id = duda.body.data.id;
    const escalar = (payload: object = {}) =>
      pedir<Nodo>('POST', `/nodos/${id}/escalar`, payload);
    const primera = await escalar();
    expect(primera.status).toBe(200);
    expect(primera.body.data.descripcion).toMatch(
      /escalada a Analista · ya hecho: contrastar con el código$/,
    );
    const fechaLocal = new Date().toLocaleDateString('sv-SE');
    expect(primera.body.data.descripcion).toContain(`- ${fechaLocal} ·`);
    const segunda = await escalar();
    expect(segunda.body.data.descripcion).toMatch(
      /escalada a Senior Back \(antes: Analista\)$/,
    );
    const esperas = await ctx.prisma.conexion.findMany({
      where: { origenId: id, tipo: 'ESPERA_RESPUESTA_DE' },
      select: { destino: { select: { titulo: true } } },
    });
    expect(esperas.map(({ destino }) => destino.titulo)).toEqual([
      'Senior Back',
    ]);
    expect((await escalar()).status).toBe(409);
    expect((await escalar({ persona: 'Senior Front' })).status).toBe(200);
  });

  it('decidir cierra la duda, deja la decisión colgada y el PBI queda libre', async () => {
    const { body } = await pedir<Nodo[]>(
      'GET',
      `/nodos/${ctx.pbi}/complementos`,
    );
    const dudas = body.data.filter(({ tipo }) => tipo === 'DUDA');
    for (const { id } of dudas) {
      const decidida = await pedir<Nodo>('POST', `/nodos/${id}/decidir`, {
        quien: 'Analista',
        donde: 'comentario en el PBI',
        texto: `respuesta a ${id}`,
      });
      expect(decidida.status).toBe(201);
      expect(decidida.body.data.complemento).toBe('decision');
    }
    const bloqueado = await pedir<{ bloqueado: boolean }>(
      'GET',
      `/nodos/${ctx.pbi}/bloqueado`,
    );
    expect(bloqueado.body.data.bloqueado).toBe(false);
    const [primera] = dudas;
    const otraVez = await pedir('POST', `/nodos/${primera?.id}/decidir`, {
      quien: 'x',
      donde: 'x',
      texto: 'x',
    });
    expect(otraVez.status).toBe(409);
    const despues = await pedir<Nodo[]>(
      'GET',
      `/nodos/${ctx.pbi}/complementos`,
    );
    const decisiones = despues.body.data.filter(
      ({ complemento }) => complemento === 'decision',
    );
    expect(decisiones).toHaveLength(dudas.length);
  });

  it('«para decir» pide un ritual del área y cuelga de él; el ritual se crea una sola vez', async () => {
    expect((await colgar('para-decir', 'avisar del feriado')).status).toBe(400);
    const ritualDeMas = await pedir('POST', `/nodos/${ctx.pbi}/complementos`, {
      tipo: 'apunte',
      titulo: 'x',
      ritual: 'daily',
    });
    expect(ritualDeMas.status).toBe(400);
    const decir = (titulo: string) =>
      pedir<Nodo>('POST', `/nodos/${ctx.pbi}/complementos`, {
        tipo: 'para-decir',
        titulo,
        ritual: 'daily',
      });
    expect((await decir('avisar del feriado')).status).toBe(201);
    expect((await decir('pedir acceso a la API')).status).toBe(201);
    const rituales = await ctx.prisma.nodo.findMany({
      where: { externoOrigen: 'ritual' },
      include: { entrantes: { where: { tipo: 'EN_DAILY_DE' } } },
    });
    expect(rituales).toHaveLength(1);
    expect(rituales[0]?.titulo).toBe('Daily');
    expect(rituales[0]?.entrantes).toHaveLength(2);
  });
  it('colgar un complemento de un nodo de un espacio sin método → 404 y no crea nada', async () => {
    const espacio = await ctx.prisma.espacio.create({
      data: { nombre: 'Máquinas del complemento' },
    });
    const proyecto = await ctx.prisma.proyecto.create({
      data: { espacioId: espacio.id, nombre: 'General' },
    });
    await ctx.prisma.tipoNodo.create({
      data: {
        espacioId: espacio.id,
        nombre: 'HERRAMIENTA',
        tieneCiclo: false,
      },
    });
    const herramienta = await ctx.prisma.nodo.create({
      data: {
        tipo: 'HERRAMIENTA',
        titulo: 'buildworkspace',
        estado: null,
        proyectoId: proyecto.id,
      },
    });
    const antes = await ctx.prisma.nodo.count();
    const res = await pedir<unknown>(
      'POST',
      `/nodos/${herramienta.id}/complementos`,
      { tipo: 'apunte', titulo: 'no debería existir' },
    );
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).toContain('no usa el método de trabajo');
    expect(await ctx.prisma.nodo.count()).toBe(antes);
  });
  describe('una duda de un espacio sin método no se escala ni se decide', () => {
    const sembrarDudaAjena = async (nombre: string) => {
      const espacio = await ctx.prisma.espacio.create({ data: { nombre } });
      const proyecto = await ctx.prisma.proyecto.create({
        data: { espacioId: espacio.id, nombre: 'General' },
      });
      await ctx.prisma.tipoNodo.create({
        data: { espacioId: espacio.id, nombre: TIPO_NODO.DUDA },
      });
      return ctx.prisma.nodo.create({
        data: {
          tipo: TIPO_NODO.DUDA,
          titulo: `duda de ${nombre}`,
          etiquetas: ['complemento:duda-negocio'],
          proyectoId: proyecto.id,
        },
      });
    };
    const intactos = async (dudaId: string, nodosAntes: number) => {
      const duda = await ctx.prisma.nodo.findUniqueOrThrow({
        where: { id: dudaId },
      });
      expect(duda.estado).toBe('ABIERTO');
      expect(duda.descripcion).toBeNull();
      expect(await ctx.prisma.nodo.count()).toBe(nodosAntes);
      expect(
        await ctx.prisma.conexion.count({
          where: { OR: [{ origenId: dudaId }, { destinoId: dudaId }] },
        }),
      ).toBe(0);
    };

    it('escalar → 404 y no escala', async () => {
      const duda = await sembrarDudaAjena('Espacio ajeno (escalar)');
      const antes = await ctx.prisma.nodo.count();
      const res = await pedir<unknown>('POST', `/nodos/${duda.id}/escalar`, {});
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toContain('no usa el método de trabajo');
      await intactos(duda.id, antes);
    });

    it('decidir → 404, no cierra la duda y no crea la decisión', async () => {
      const duda = await sembrarDudaAjena('Espacio ajeno (decidir)');
      const antes = await ctx.prisma.nodo.count();
      const res = await pedir<unknown>('POST', `/nodos/${duda.id}/decidir`, {
        quien: 'Alguien',
        donde: 'Teams',
        texto: 'no debería existir',
      });
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toContain('no usa el método de trabajo');
      await intactos(duda.id, antes);
    });
  });
});
