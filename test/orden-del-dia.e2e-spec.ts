import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AreaService } from './../src/modules/area/area.service';
import { RolesService } from './../src/modules/roles/roles.service';

const PREFIJO = '/api/v1';
const FIXTURES = join(__dirname, 'fixtures/fases');
const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe('El orden del día (e2e) — PUT /nodos/orden-del-dia', () => {
  const ctx = {} as { app: NestFastifyApplication; prisma: PrismaService };
  const ordenar = (ids: string[]) =>
    ctx.app.inject({
      method: 'PUT',
      url: `${PREFIJO}/nodos/orden-del-dia`,
      payload: { ids },
    });
  const etiquetasDe = async (id: string) =>
    (await ctx.prisma.nodo.findUniqueOrThrow({ where: { id } })).etiquetas;

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
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('numera las tarjetas en el orden pedido y borra el día anterior sin tocar su fecha', async () => {
    const crear = (titulo: string, etiquetas: string[] = []) =>
      ctx.prisma.nodo.create({
        data: { tipo: TipoNodo.TAREA, titulo, etiquetas },
      });
    const primera = await crear('[1] primera', ['board']);
    const segunda = await crear('[2] segunda');
    const deAyer = await ctx.prisma.nodo.create({
      data: {
        tipo: TipoNodo.TAREA,
        titulo: '[3] cerrada ayer',
        estado: EstadoNodo.CERRADO,
        etiquetas: ['board', 'hoy:1'],
        updatedAt: AYER,
      },
    });

    const res = await ordenar([segunda.id, primera.id]);

    expect(res.statusCode).toBe(200);
    expect(await etiquetasDe(segunda.id)).toEqual(['hoy:1']);
    expect(await etiquetasDe(primera.id)).toEqual(['board', 'hoy:2']);
    expect(await etiquetasDe(deAyer.id)).toEqual(['board']);
    // Si la fecha cambiara, «terminé» del parte (GET /derivado/dia) la contaría como cerrada hoy.
    const ayer = await ctx.prisma.nodo.findUniqueOrThrow({
      where: { id: deAyer.id },
    });
    expect(ayer.updatedAt).toEqual(AYER);
  });

  it('una lista vacía deja el día sin nada', async () => {
    expect((await ordenar([])).statusCode).toBe(200);
    const conDia = await ctx.prisma.nodo.findMany({
      where: { etiquetas: { hasSome: ['hoy:1', 'hoy:2'] } },
    });
    expect(conDia).toEqual([]);
  });

  it('400 con una FASE; 404 con un id que no existe; y nada cambia', async () => {
    const tarjeta = await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.TAREA, titulo: '[4] queda igual' },
    });
    const fase = await ctx.prisma.nodo.create({
      data: { tipo: TipoNodo.FASE, titulo: 'FASE 9' },
    });

    expect((await ordenar([tarjeta.id, fase.id])).statusCode).toBe(400);
    expect(
      (await ordenar([tarjeta.id, '123e4567-e89b-12d3-a456-426614174999']))
        .statusCode,
    ).toBe(404);
    expect(await etiquetasDe(tarjeta.id)).toEqual([]);
  });
});
