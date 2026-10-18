import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Cara, TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AreaService } from './../src/modules/area/area.service';
import { RolesService } from './../src/modules/roles/roles.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface Pagina {
  id: string;
  libro: string;
  cara: Cara;
  titulo: string;
  historiaId: string | null;
  nodos: string[];
  abiertas: number;
}

const PREFIJO = '/api/v1';
const FIXTURES = join(__dirname, 'fixtures/fases');

describe('Las páginas de la VR (e2e, FASE 15) — una por HU, la API decide', () => {
  const ctx = {} as {
    app: NestFastifyApplication;
    ids: Record<string, string>;
  };

  beforeAll(async () => {
    const entorno: Record<string, string> = {
      ROLES_ARCHIVO: join(FIXTURES, 'roles.yaml'),
      REFS_ARCHIVO: join(FIXTURES, 'refs.yaml'),
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
    const prisma = ctx.app.get(PrismaService);
    await prisma.conexion.deleteMany();
    await prisma.nodo.deleteMany();

    const crear = (tipo: TipoNodo, titulo: string) =>
      prisma.nodo.create({ data: { tipo, titulo } });
    const conectar = (
      origenId: string,
      tipo: TipoConexion,
      destinoId: string,
    ) => prisma.conexion.create({ data: { origenId, destinoId, tipo } });
    const hu = await crear(TipoNodo.HISTORIA, 'HU 19565 · Toma de muestras');
    const otra = await crear(TipoNodo.HISTORIA, 'HU 20379 · Dashboard');
    const fase = await crear(TipoNodo.FASE, 'FASE 22');
    const tarjeta = await crear(TipoNodo.TAREA, '[25936] FASE 22 · PR 5090');
    const duda = await crear(TipoNodo.DUDA, '¿el limit acepta 1 a 100?');
    const rama = await crear(TipoNodo.RAMA, '🔵');
    const nota = await crear(TipoNodo.TAREA, '01-oct · retro');
    // FASE 17: una pieza del Draft de la HU 20379 es su plan, no su trabajo.
    const pieza = await prisma.nodo.create({
      data: {
        tipo: TipoNodo.TAREA,
        titulo: '2️⃣ 20379 · 0.4 · Catálogo',
        cara: Cara.PLAN,
      },
    });
    await conectar(pieza.id, TipoConexion.PERTENECE_A, otra.id);
    await conectar(fase.id, TipoConexion.PERTENECE_A, hu.id);
    await conectar(tarjeta.id, TipoConexion.PERTENECE_A, fase.id);
    await conectar(tarjeta.id, TipoConexion.PERTENECE_A, rama.id);
    await conectar(tarjeta.id, TipoConexion.BLOQUEADA_POR, duda.id);
    ctx.ids = {
      hu: hu.id,
      otra: otra.id,
      fase: fase.id,
      tarjeta: tarjeta.id,
      duda: duda.id,
      rama: rama.id,
      nota: nota.id,
      pieza: pieza.id,
    };
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /derivado/paginas: la HU con su árbol y su duda; la otra HU sola y su plan aparte; «Sin HU» con la nota', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `${PREFIJO}/derivado/paginas`,
    });
    const paginas = (JSON.parse(res.body) as Envuelto<Pagina[]>).data;
    const { hu, otra, fase, tarjeta, duda, rama, nota, pieza } = ctx.ids;

    expect(res.statusCode).toBe(200);
    expect(paginas.map(({ id }) => id)).toEqual([
      hu,
      otra,
      `${otra}:plan`,
      'sin-hu',
    ]);
    expect([...paginas[0].nodos].sort()).toEqual(
      [hu, fase, tarjeta, duda].sort(),
    );
    expect(paginas[0]).toMatchObject({
      titulo: 'HU 19565 · Toma de muestras',
      historiaId: hu,
      abiertas: 1,
    });
    expect(paginas[1]).toMatchObject({ nodos: [otra], cara: Cara.REAL });
    expect(paginas[2]).toMatchObject({ libro: otra, cara: Cara.PLAN });
    expect([...paginas[2].nodos].sort()).toEqual([otra, pieza].sort());
    expect(paginas[3]).toMatchObject({
      historiaId: null,
      nodos: [nota],
      abiertas: 1,
    });
    expect(paginas.flatMap(({ nodos }) => nodos)).not.toContain(rama);
  });

  it('GET /nodos/:id/familia: la HU ilumina su árbol; la tarjeta, con qué se conecta; un id que no existe da 404', async () => {
    const familia = async (id: string) => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: `${PREFIJO}/nodos/${id}/familia`,
      });
      return {
        status: res.statusCode,
        ids: (
          (JSON.parse(res.body) as Envuelto<{ ids?: string[] }>).data?.ids ?? []
        ).sort(),
      };
    };
    const { hu, fase, tarjeta, duda, rama } = ctx.ids;

    expect(await familia(hu)).toEqual({
      status: 200,
      ids: [hu, fase, tarjeta].sort(),
    });
    expect((await familia(tarjeta)).ids).toEqual(
      [tarjeta, fase, rama, duda].sort(),
    );
    expect((await familia('00000000-0000-4000-8000-000000000000')).status).toBe(
      404,
    );
  });
});
