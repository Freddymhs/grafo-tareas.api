import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../src/common/constants/tipos.constants';
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
  cara: Cara;
  etiquetas: string[];
}

const PREFIJO = '/api/v1';
const FIXTURES = join(__dirname, 'fixtures/fases');
const CABECERA = (nm: string) =>
  `# ${nm} · Catálogo de criterios   HU 20379 · task por crear · reparto 2026-10-18\n\nla especificación`;

describe('POST /piezas (e2e, FASE 19) — una pieza del reparto entra al plan con la regla del importador', () => {
  const ctx = {} as {
    app: NestFastifyApplication;
    prisma: PrismaService;
    hu: string;
    carril: string;
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
    ctx.prisma = ctx.app.get(PrismaService);
    await vaciarBase(ctx.prisma);
    const { proyectoSagId } = await sembrarEspacioTrabajo(ctx.prisma);
    // La HU y un carril que ya trajo el importador del tablero, con sus externos.
    const hu = await ctx.prisma.nodo.create({
      data: {
        proyectoId: proyectoSagId,
        tipo: TIPO_NODO.HISTORIA,
        titulo: 'HU 20379 · Dashboard',
        externoOrigen: 'tracker',
        externoId: 'hu:20379',
      },
    });
    const carril = await ctx.prisma.nodo.create({
      data: {
        proyectoId: proyectoSagId,
        tipo: TIPO_NODO.RAMA,
        titulo: '20379 · C · Recepción',
        etiquetas: ['carril'],
        externoOrigen: 'todoist',
        externoId: 'carril:20379:C · Recepción',
      },
    });
    ctx.hu = hu.id;
    ctx.carril = carril.id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const crear = (cuerpo: Record<string, string>) =>
    ctx.app.inject({
      method: 'POST',
      url: `${PREFIJO}/piezas`,
      payload: cuerpo,
    });
  const destinosDe = async (id: string) =>
    (
      await ctx.prisma.conexion.findMany({
        where: { origenId: id, tipo: TIPO_CONEXION.PERTENECE_A },
      })
    ).map(({ destinoId }) => destinoId);

  it('queda en la cara PLAN con pieza, ronda y estado, y cuelga de su HU y del carril que ya existía (sin duplicarlos)', async () => {
    const res = await crear({
      carril: 'C · Recepción',
      titulo: '2️⃣ 20379 · 0.4 · Catálogo de criterios · por crear',
      descripcion: CABECERA('0.4'),
    });
    expect(res.statusCode).toBe(201);
    const pieza = (JSON.parse(res.body) as Envuelto<Nodo>).data;
    expect(pieza).toMatchObject({
      cara: Cara.PLAN,
      etiquetas: ['pieza', 'ronda:2', 'por-crear'],
    });
    expect((await destinosDe(pieza.id)).sort()).toEqual(
      [ctx.hu, ctx.carril].sort(),
    );
    expect(
      await ctx.prisma.nodo.count({ where: { tipo: TIPO_NODO.HISTORIA } }),
    ).toBe(1);
    expect(
      await ctx.prisma.nodo.count({
        where: { titulo: '20379 · C · Recepción' },
      }),
    ).toBe(1);
    // Y la vista del plan la muestra en la columna de su carril.
    const plan = await ctx.app.inject({
      method: 'GET',
      url: `${PREFIJO}/derivado/plan?libro=${ctx.hu}`,
    });
    const carriles = (
      JSON.parse(plan.body) as Envuelto<
        { id: string | null; nodos: { id: string }[] }[]
      >
    ).data;
    expect(carriles.find(({ id }) => id === ctx.carril)?.nodos).toEqual([
      expect.objectContaining({ id: pieza.id }),
    ]);
  });

  it('un carril nuevo es una RAMA «HU · carril» con la etiqueta carril, como la deja el importador', async () => {
    const res = await crear({
      carril: 'A · Bandeja',
      titulo: '2️⃣ 20379 · 1.6 · Buscador · por crear',
      descripcion: CABECERA('1.6'),
    });
    expect(res.statusCode).toBe(201);
    const rama = await ctx.prisma.nodo.findFirst({
      where: { titulo: '20379 · A · Bandeja' },
    });
    expect(rama).toMatchObject({ tipo: TIPO_NODO.RAMA, etiquetas: ['carril'] });
  });

  it('sin la cabecera del reparto, o con un carril mal nombrado, no es una pieza: 400 y no se guarda nada', async () => {
    const antes = await ctx.prisma.nodo.count();
    const sinCabecera = await crear({
      carril: 'C · Recepción',
      titulo: '2️⃣ algo',
      descripcion: 'una nota cualquiera',
    });
    expect(sinCabecera.statusCode).toBe(400);
    const carrilMalo = await crear({
      carril: 'Recepción',
      titulo: '2️⃣ 20379 · 0.4 · x',
      descripcion: CABECERA('0.4'),
    });
    expect(carrilMalo.statusCode).toBe(400);
    expect(await ctx.prisma.nodo.count()).toBe(antes);
  });
});
