import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { RolesService } from './../src/modules/roles/roles.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface Rol {
  clave: string;
  columnas: string[];
  etapas: { columna: string; que: string | null }[];
}
interface Pagina {
  data: { titulo: string }[];
}

const PREFIJO = '/api/v1';
const ROLES = join(__dirname, 'fixtures/fases/roles.yaml');

describe('Roles (e2e) — GET /roles, GET /etapas con las columnas de los roles y GET /nodos?rol=', () => {
  const ctx = {} as { app: NestFastifyApplication; prisma: PrismaService };

  const get = async <T>(url: string) => {
    const res = await ctx.app.inject({ method: 'GET', url: PREFIJO + url });
    return {
      status: res.statusCode,
      body: JSON.parse(res.body) as Envuelto<T>,
    };
  };
  const titulos = async (url: string) =>
    (await get<Pagina>(url)).body.data.data.map(({ titulo }) => titulo).sort();

  beforeAll(async () => {
    // El RolesService de la app, pero con ROLES_ARCHIVO apuntando a la fixture (el resto del entorno, el de siempre).
    const conRoles = new RolesService({
      get: (clave: string) => (clave === 'ROLES_ARCHIVO' ? ROLES : undefined),
    } as unknown as ConfigService);
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RolesService)
      .useValue(conRoles)
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
    await ctx.prisma.nodo.createMany({
      data: [
        { tipo: TipoNodo.FASE, titulo: 'de producto', etiquetas: ['producto'] },
        { tipo: TipoNodo.TAREA, titulo: 'sin rol', etiquetas: ['daily'] },
        {
          tipo: TipoNodo.FASE,
          titulo: 'de calidad',
          etiquetas: ['calidad', 'daily'],
        },
      ],
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /roles da el defecto y las columnas de cada rol, en orden', async () => {
    const { status, body } = await get<{ defecto: string; roles: Rol[] }>(
      '/roles',
    );
    expect(status).toBe(200);
    expect(body.data.defecto).toBe('producto');
    expect(body.data.roles.map(({ clave }) => clave)).toEqual([
      'producto',
      'calidad',
    ]);
    expect(body.data.roles[1]?.columnas).toContain('CAMBIAR 🧰');
    const etapas = body.data.roles[1]?.etapas ?? [];
    expect(etapas.find(({ columna }) => columna === 'AMARRAR 🧰')?.que).toBe(
      'línea base y tests contra el código sin tocar',
    );
  });

  it('toda columna de un rol está en GET /etapas', async () => {
    const etapas = (await get<string[]>('/etapas')).body.data;
    const roles = (await get<{ roles: Rol[] }>('/roles')).body.data.roles;
    const faltan = roles
      .flatMap(({ columnas }) => columnas)
      .filter((columna) => !etapas.includes(columna));
    expect(faltan).toEqual([]);
  });

  it('?rol= del defecto trae lo que no es de otro rol; el de otro rol, lo suyo; y se combina con etiqueta', async () => {
    expect(await titulos('/nodos?rol=producto')).toEqual([
      'de producto',
      'sin rol',
    ]);
    expect(await titulos('/nodos?rol=calidad')).toEqual(['de calidad']);
    expect(await titulos('/nodos?rol=producto&etiqueta=daily')).toEqual([
      'sin rol',
    ]);
  });

  it('un rol que no existe es 400', async () => {
    expect((await get('/nodos?rol=nadie')).status).toBe(400);
  });
});
