import { opcionesCors } from '@config/cors.js';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface ConId {
  id: string;
}
interface Resumen extends ConId {
  titulo: string;
}
interface Bloqueado {
  bloqueado: boolean;
  por: Resumen[];
}
interface Libera {
  directos: Resumen[];
  cadena: Resumen[];
}

const PREFIJO = '/api/v1';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const ORIGEN_WEB = 'http://localhost:3001';

describe('Grafo (e2e) — el escenario del concepto: Tomás, una duda W2 y tres tareas', () => {
  // Lo llena beforeAll una sola vez: un holder en vez de `let` (regla §0).
  const ctx = {} as { app: NestFastifyApplication; prisma: PrismaService };

  const post = async <T>(url: string, payload: object) => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: PREFIJO + url,
      payload,
    });
    return {
      status: res.statusCode,
      body: JSON.parse(res.body) as Envuelto<T>,
    };
  };
  const get = async <T>(url: string) => {
    const res = await ctx.app.inject({ method: 'GET', url: PREFIJO + url });
    return {
      status: res.statusCode,
      body: JSON.parse(res.body) as Envuelto<T>,
    };
  };
  const nodo = async (tipo: TipoNodo, titulo: string) =>
    (await post<ConId>('/nodos', { tipo, titulo })).body.data.id;
  const conectar = (origenId: string, destinoId: string, tipo: TipoConexion) =>
    post<ConId>('/conexiones', { origenId, destinoId, tipo });
  const titulos = (nodos: Resumen[]) =>
    nodos.map(({ titulo }) => titulo).sort();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    ctx.app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    ctx.app.setGlobalPrefix('api/v1');
    ctx.app.enableCors(opcionesCors([ORIGEN_WEB]));
    await ctx.app.init();
    await ctx.app.getHttpAdapter().getInstance().ready();
    ctx.prisma = ctx.app.get(PrismaService);
    await ctx.prisma.conexion.deleteMany();
    await ctx.prisma.nodo.deleteMany();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const ids: Record<string, string> = {};

  it('crea una rama y rechaza color fuera de una RAMA', async () => {
    const rama = await post<ConId>('/ramas', {
      titulo: 'Control fronterizo',
      color: '#3b82f6',
    });
    expect(rama.status).toBe(201);
    ids.rama = rama.body.data.id;

    const conColor = await post('/nodos', {
      tipo: TipoNodo.TAREA,
      titulo: 'x',
      color: '#ffffff',
    });
    expect(conColor.status).toBe(400);
  });

  it('un importador no duplica: mismo origen + id → 409 (C3)', async () => {
    const externo = { externoOrigen: 'todoist', externoId: '123' };
    const primero = await post('/nodos', {
      tipo: TipoNodo.TAREA,
      titulo: 'a',
      ...externo,
    });
    const segundo = await post('/nodos', {
      tipo: TipoNodo.TAREA,
      titulo: 'b',
      ...externo,
    });
    expect([primero.status, segundo.status]).toEqual([201, 409]);
  });

  it('arma el grafo y valida las conexiones', async () => {
    ids.tomas = await nodo(TipoNodo.PERSONA, 'Tomás');
    ids.duda = await nodo(TipoNodo.DUDA, 'W2 · ¿condición o tabla?');
    ids.t1 = await nodo(TipoNodo.TAREA, 'Validador del paso 3');
    ids.t2 = await nodo(TipoNodo.TAREA, 'Service del paso 3');
    ids.t3 = await nodo(TipoNodo.TAREA, 'Postman del PBI');
    ids.libre = await nodo(TipoNodo.TAREA, 'Leer la wiki');

    expect(
      (await conectar(ids.duda, ids.tomas, TipoConexion.ESPERA_RESPUESTA_DE))
        .status,
    ).toBe(201);
    await conectar(ids.t1, ids.duda, TipoConexion.BLOQUEADA_POR);
    await conectar(ids.t2, ids.duda, TipoConexion.BLOQUEADA_POR);
    await conectar(ids.t3, ids.t1, TipoConexion.DEPENDE_DE);
    await conectar(ids.t1, ids.rama, TipoConexion.PERTENECE_A);
    await conectar(ids.libre, ids.rama, TipoConexion.PERTENECE_A);

    expect(
      (await conectar(ids.t1, ids.duda, TipoConexion.BLOQUEADA_POR)).status,
    ).toBe(409);
    expect(
      (await conectar(ids.t1, ids.t1, TipoConexion.DEPENDE_DE)).status,
    ).toBe(400);
    expect(
      (await conectar(ids.t1, UUID_INEXISTENTE, TipoConexion.DEPENDE_DE))
        .status,
    ).toBe(404);
  });

  it('bloqueado: la tarea espera la duda; la libre no espera nada (C1)', async () => {
    const t1 = await get<Bloqueado>(`/nodos/${ids.t1}/bloqueado`);
    expect(t1.body.data.bloqueado).toBe(true);
    expect(titulos(t1.body.data.por)).toEqual(['W2 · ¿condición o tabla?']);

    const libre = await get<Bloqueado>(`/nodos/${ids.libre}/bloqueado`);
    expect(libre.body.data.bloqueado).toBe(false);
  });

  it('hoy puedo: solo lo abierto que nada bloquea, y nunca personas, dudas ni ramas', async () => {
    const hoy = await get<Resumen[]>('/derivado/hoy-puedo');
    expect(titulos(hoy.body.data)).toEqual(['Leer la wiki', 'a']);
  });

  it('si Tomás contesta: libera la duda directo y las tres tareas en cadena', async () => {
    const libera = await get<Libera>(`/nodos/${ids.tomas}/libera`);
    expect(titulos(libera.body.data.directos)).toEqual([
      'W2 · ¿condición o tabla?',
    ]);
    expect(titulos(libera.body.data.cadena)).toEqual([
      'Postman del PBI',
      'Service del paso 3',
      'Validador del paso 3',
    ]);
  });

  it('un ciclo A→B→A no cuelga la consulta', async () => {
    const a = await nodo(TipoNodo.TAREA, 'ciclo-a');
    const b = await nodo(TipoNodo.TAREA, 'ciclo-b');
    await conectar(a, b, TipoConexion.DEPENDE_DE);
    await conectar(b, a, TipoConexion.DEPENDE_DE);

    const libera = await get<Libera>(`/nodos/${a}/libera`);
    expect(libera.status).toBe(200);
    // B solo esperaba a A: queda libre. A no se lista a sí mismo. La recursión del SQL y el punto fijo terminan.
    expect(titulos(libera.body.data.directos)).toEqual(['ciclo-b']);
    expect(libera.body.data.cadena).toEqual([]);
  });

  it('las ramas cuentan sus miembros', async () => {
    const ramas = await get<Array<ConId & { miembros: number }>>('/ramas');
    const rama = ramas.body.data.find(({ id }) => id === ids.rama);
    expect(rama?.miembros).toBe(2);
  });

  it('las posiciones se guardan en lote y se leen (C2); un id inexistente tumba el lote', async () => {
    const guardar = await ctx.app.inject({
      method: 'PUT',
      url: `${PREFIJO}/nodos/posiciones`,
      payload: { posiciones: [{ id: ids.t1, x: 1, y: 1.6, z: -2 }] },
    });
    expect(guardar.statusCode).toBe(200);

    const t1 = await get<{ posX: number; posY: number; posZ: number }>(
      `/nodos/${ids.t1}`,
    );
    expect([t1.body.data.posX, t1.body.data.posY, t1.body.data.posZ]).toEqual([
      1, 1.6, -2,
    ]);

    const roto = await ctx.app.inject({
      method: 'PUT',
      url: `${PREFIJO}/nodos/posiciones`,
      payload: { posiciones: [{ id: UUID_INEXISTENTE, x: 0, y: 0, z: 0 }] },
    });
    expect(roto.statusCode).toBe(404);
  });

  it('el preflight CORS de la PWA acepta PATCH y DELETE (por defecto @fastify/cors solo deja GET,HEAD,POST)', async () => {
    const preflight = async (metodo: string) => {
      const res = await ctx.app.inject({
        method: 'OPTIONS',
        url: `${PREFIJO}/nodos/${ids.t1}`,
        headers: {
          origin: ORIGEN_WEB,
          'access-control-request-method': metodo,
        },
      });
      return String(res.headers['access-control-allow-methods'] ?? '');
    };
    expect(await preflight('PATCH')).toContain('PATCH');
    expect(await preflight('DELETE')).toContain('DELETE');
  });

  it('mover de etapa: una de GET /etapas entra, null vuelve a la entrada, vacía se rechaza', async () => {
    const etapas = await get<string[]>('/etapas');
    const [primera] = etapas.body.data;
    const patch = (etapa: string | null) =>
      ctx.app.inject({
        method: 'PATCH',
        url: `${PREFIJO}/nodos/${ids.t1}`,
        payload: { etapa },
      });

    expect((await patch(primera)).statusCode).toBe(200);
    expect(
      (await get<{ etapa: string | null }>(`/nodos/${ids.t1}`)).body.data.etapa,
    ).toBe(primera);

    expect((await patch(null)).statusCode).toBe(200);
    expect(
      (await get<{ etapa: string | null }>(`/nodos/${ids.t1}`)).body.data.etapa,
    ).toBeNull();

    expect((await patch('')).statusCode).toBe(400);
    expect((await patch('NO_EXISTE')).statusCode).toBe(400);
  });

  it('?cara= separa el trabajo del plan (FASE 17): mover a otra cara con PATCH lo cambia de lista', async () => {
    const enCara = async (cara: string) =>
      (
        await get<{ data: Resumen[] }>(`/nodos?cara=${cara}&limit=100`)
      ).body.data.data.map(({ id }) => id);
    expect(await enCara('REAL')).toContain(ids.t2);
    expect(await enCara('PLAN')).not.toContain(ids.t2);

    const mover = (cara: string) =>
      ctx.app.inject({
        method: 'PATCH',
        url: `${PREFIJO}/nodos/${ids.t2}`,
        payload: { cara, motivo: 'e2e: mover al plan y volver' },
      });
    expect((await mover('PLAN')).statusCode).toBe(200);
    expect(await enCara('PLAN')).toContain(ids.t2);
    expect(await enCara('REAL')).not.toContain(ids.t2);
    expect((await mover('REAL')).statusCode).toBe(200);
    expect(await enCara('REAL')).toContain(ids.t2);

    expect((await get('/nodos?cara=OTRA')).status).toBe(400);
  });

  it('cerrar la duda libera la tarea; borrar un nodo borra sus conexiones', async () => {
    const cerrar = await ctx.app.inject({
      method: 'PATCH',
      url: `${PREFIJO}/nodos/${ids.duda}`,
      payload: { estado: EstadoNodo.CERRADO },
    });
    expect(cerrar.statusCode).toBe(200);
    const t1 = await get<Bloqueado>(`/nodos/${ids.t1}/bloqueado`);
    expect(t1.body.data.bloqueado).toBe(false);

    const borrar = await ctx.app.inject({
      method: 'DELETE',
      url: `${PREFIJO}/nodos/${ids.t3}`,
    });
    expect(borrar.statusCode).toBe(204);
    expect((await get(`/nodos/${ids.t3}`)).status).toBe(404);
    const conexionesDeT3 = await ctx.prisma.conexion.count({
      where: { OR: [{ origenId: ids.t3 }, { destinoId: ids.t3 }] },
    });
    expect(conexionesDeT3).toBe(0);
  });

  it('depender de algo ya mergeado no bloquea; estar bloqueada por eso, sí (Freddy, 2026-10-21)', async () => {
    const mergeada = await ctx.prisma.nodo.create({
      data: {
        tipo: TipoNodo.FASE,
        titulo: 'FASE 38 · mergeada, con trámites',
        etiquetas: ['producto', 'mergeada'],
      },
    });
    const depende = await nodo(TipoNodo.TAREA, 'depende de la 38');
    const frenada = await nodo(TipoNodo.TAREA, 'bloqueada por la 38');
    await conectar(depende, mergeada.id, TipoConexion.DEPENDE_DE);
    await conectar(frenada, mergeada.id, TipoConexion.BLOQUEADA_POR);

    const libre = await get<Bloqueado>(`/nodos/${depende}/bloqueado`);
    expect(libre.body.data.bloqueado).toBe(false);
    const sigue = await get<Bloqueado>(`/nodos/${frenada}/bloqueado`);
    expect(sigue.body.data.bloqueado).toBe(true);
  });
});
