import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AreaService } from './../src/modules/area/area.service';
import { RolesService } from './../src/modules/roles/roles.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface Cambio {
  nodoId: string;
  tipo: string;
  campo: string | null;
  antes: string | null;
  despues: string | null;
  motivo: string | null;
}

const PREFIJO = '/api/v1';
const FIXTURES = join(__dirname, 'fixtures/fases');

describe('El pulido del grafo (e2e, FASE 16) — descartar sin borrar y la bitácora', () => {
  const ctx = {} as {
    app: NestFastifyApplication;
    prisma: PrismaService;
    ids: Record<string, string>;
  };
  const pedir = async <T>(
    method: 'GET' | 'POST' | 'PATCH',
    url: string,
    payload?: object,
  ) => {
    const res = await ctx.app.inject({
      method,
      url: `${PREFIJO}${url}`,
      payload,
    });
    return {
      status: res.statusCode,
      data: (JSON.parse(res.body) as Envuelto<T>).data,
    };
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
    await ctx.prisma.conexion.deleteMany();
    await ctx.prisma.nodo.deleteMany();
    await ctx.prisma.descarte.deleteMany();
    await ctx.prisma.cambio.deleteMany();

    const crear = (tipo: TipoNodo, titulo: string) =>
      ctx.prisma.nodo.create({
        data: { tipo, titulo, posX: 1, posY: 2, posZ: 3 },
      });
    const fase = await crear(TipoNodo.FASE, 'FASE 22');
    const tarjeta = await crear(TipoNodo.TAREA, 'preguntas');
    const duda = await crear(TipoNodo.DUDA, '¿qué preguntas?');
    const nota = await crear(TipoNodo.TAREA, '01-oct · retro');
    await ctx.prisma.conexion.createMany({
      data: [
        {
          origenId: tarjeta.id,
          destinoId: fase.id,
          tipo: TipoConexion.PERTENECE_A,
        },
        {
          origenId: tarjeta.id,
          destinoId: duda.id,
          tipo: TipoConexion.BLOQUEADA_POR,
        },
      ],
    });
    ctx.ids = {
      fase: fase.id,
      tarjeta: tarjeta.id,
      duda: duda.id,
      nota: nota.id,
    };
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('descartar saca el nodo de todo lo que se lee, lo archiva con sus conexiones y lo anota', async () => {
    const { tarjeta } = ctx.ids;
    const hecho = await pedir<{ conexionesArchivadas: number }>(
      'POST',
      `/nodos/${tarjeta}/descartar`,
      { motivo: 'sin contenido' },
    );
    expect(hecho).toEqual({
      status: 201,
      data: expect.objectContaining({ conexionesArchivadas: 2 }) as unknown,
    });
    expect((await pedir('GET', `/nodos/${tarjeta}`)).status).toBe(404);
    expect(await ctx.prisma.conexion.count()).toBe(0);
    const descartes = await pedir<{ nodoId: string; motivo: string }[]>(
      'GET',
      '/descartes',
    );
    expect(descartes.data).toEqual([
      expect.objectContaining({ nodoId: tarjeta, motivo: 'sin contenido' }),
    ]);
    const cambios = await pedir<Cambio[]>('GET', '/cambios');
    expect(cambios.data[0]).toEqual(
      expect.objectContaining({
        nodoId: tarjeta,
        tipo: 'DESCARTE',
        motivo: 'sin contenido',
      }),
    );
  });

  it('sin motivo no se descarta; un nodo que no existe da 404', async () => {
    expect(
      (await pedir('POST', `/nodos/${ctx.ids.nota}/descartar`, {})).status,
    ).toBe(400);
    expect(
      (
        await pedir(
          'POST',
          '/nodos/00000000-0000-4000-8000-000000000000/descartar',
          {
            motivo: 'x',
          },
        )
      ).status,
    ).toBe(404);
  });

  it('restaurar lo devuelve igual: mismo id, su posición y sus conexiones', async () => {
    const { tarjeta } = ctx.ids;
    const hecho = await pedir<{
      conexionesRecuperadas: number;
      conexionesPerdidas: number;
    }>('POST', `/descartes/${tarjeta}/restaurar`, {});
    expect(hecho.status).toBe(201);
    expect(hecho.data).toEqual(
      expect.objectContaining({
        conexionesRecuperadas: 2,
        conexionesPerdidas: 0,
      }),
    );
    const vuelto = await ctx.prisma.nodo.findUniqueOrThrow({
      where: { id: tarjeta },
    });
    expect(vuelto).toEqual(
      expect.objectContaining({ titulo: 'preguntas', posX: 1, posZ: 3 }),
    );
    expect(await ctx.prisma.conexion.count()).toBe(2);
    expect((await pedir<unknown[]>('GET', '/descartes')).data).toEqual([]);
    expect((await pedir<Cambio[]>('GET', '/cambios')).data[0]?.tipo).toBe(
      'RESTAURACION',
    );
  });

  it('una edición queda en la bitácora: el campo, el antes, el después y el motivo', async () => {
    const { nota } = ctx.ids;
    const editado = await pedir('PATCH', `/nodos/${nota}`, {
      titulo: '01-oct · retro del sprint 6',
      motivo: 'más claro',
    });
    expect(editado.status).toBe(200);
    const cambios = await pedir<Cambio[]>('GET', '/cambios');
    expect(cambios.data[0]).toEqual(
      expect.objectContaining({
        nodoId: nota,
        tipo: 'EDICION',
        campo: 'titulo',
        antes: '01-oct · retro',
        despues: '01-oct · retro del sprint 6',
        motivo: 'más claro',
      }),
    );
  });

  it('GET /contraste: de lo que vino de una fuente, qué se editó y qué se descartó (con el denominador)', async () => {
    const crearImportado = (externoId: string, titulo: string) =>
      ctx.prisma.nodo.create({
        data: {
          tipo: TipoNodo.TAREA,
          titulo,
          externoOrigen: 'todoist',
          externoId,
        },
      });
    const igual = await crearImportado('T1', 'sigue igual');
    const aEditar = await crearImportado('T2', 'título viejo');
    const aDescartar = await crearImportado('T3', 'basura');
    await pedir('PATCH', `/nodos/${aEditar.id}`, {
      titulo: 'título nuevo',
      motivo: 'más claro',
    });
    await pedir('POST', `/nodos/${aDescartar.id}/descartar`, {
      motivo: 'sin contenido',
    });

    const { status, data } = await pedir<{
      resumen: Record<string, number>;
      diferencias: { externoId: string; estado: string }[];
    }>('GET', '/contraste');

    expect(status).toBe(200);
    expect(data.resumen).toEqual({
      total: 3,
      iguales: 1,
      editados: 1,
      descartados: 1,
    });
    expect(
      data.diferencias
        .map(({ externoId, estado }) => `${externoId}:${estado}`)
        .sort(),
    ).toEqual(['T2:EDITADO', 'T3:DESCARTADO']);
    expect(data.diferencias.map(({ externoId }) => externoId)).not.toContain(
      igual.externoId,
    );
  });
});
