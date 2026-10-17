import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/database/prisma.service';
import { AreaService } from './../src/modules/area/area.service';
import { RolesService } from './../src/modules/roles/roles.service';

/** La forma que da el ResponseInterceptor: { statusCode, data, meta }. */
interface Envuelto<T> {
  data: T;
}
interface Resumen {
  titulo: string;
}
interface Dia {
  limiteEnCurso: number;
  terminado: Resumen[];
  enCurso: { nodo: Resumen; etapa: string; bloqueado: boolean }[];
  detenido: { nodo: Resumen; por: Resumen[] }[];
  paraDecir: { nodo: Resumen; ritual: string }[];
  tramites: Resumen[];
}

const PREFIJO = '/api/v1';
const FIXTURES = join(__dirname, 'fixtures/fases');

describe('El día (e2e) — terminé, en curso, detenido y para decir', () => {
  const ctx = {} as { app: NestFastifyApplication; prisma: PrismaService };
  const titulos = (lista: Resumen[]) =>
    lista.map(({ titulo }) => titulo).sort();
  const dia = async (query = '') => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: `${PREFIJO}/derivado/dia${query}`,
    });
    return {
      status: res.statusCode,
      body: (JSON.parse(res.body) as Envuelto<Dia>).data,
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

    const crear = (data: {
      tipo: TipoNodo;
      titulo: string;
      etapa?: string;
      estado?: EstadoNodo;
      etiquetas?: string[];
    }) => ctx.prisma.nodo.create({ data });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'codeando',
      etapa: 'EN CODIGO',
    });
    await crear({ tipo: TipoNodo.FASE, titulo: 'FASE 3', etapa: 'AMARRAR 🧰' });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'esperando el PR',
      etapa: 'Pull Request',
    });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'cerrada hoy',
      estado: EstadoNodo.CERRADO,
    });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'decisión (nota)',
      estado: EstadoNodo.CERRADO,
      etiquetas: ['complemento:decision'],
    });
    const frenada = await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'frenada',
      etapa: 'TESTEADO',
    });
    const duda = await crear({ tipo: TipoNodo.DUDA, titulo: '¿pagina?' });
    await ctx.prisma.conexion.create({
      data: {
        origenId: frenada.id,
        destinoId: duda.id,
        tipo: TipoConexion.BLOQUEADA_POR,
      },
    });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'FASE 7: falta URL commit',
      etiquetas: ['complemento:tramite'],
    });
    await crear({
      tipo: TipoNodo.TAREA,
      titulo: 'FASE 6: cierre oficial completo',
      estado: EstadoNodo.CERRADO,
      etiquetas: ['complemento:tramite'],
    });
    const pbi = await crear({ tipo: TipoNodo.HISTORIA, titulo: 'PBI' });
    await ctx.app.inject({
      method: 'POST',
      url: `${PREFIJO}/nodos/${pbi.id}/complementos`,
      payload: {
        tipo: 'para-decir',
        titulo: 'avisar del feriado',
        ritual: 'daily',
      },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('terminé: tareas y FASE cerradas en las últimas 24 h, sin las notas', async () => {
    const { status, body } = await dia();
    expect(status).toBe(200);
    // Un trámite de cierre completado también es «terminé» (subir URL commit y evidencias es trabajo); una nota, no.
    expect(titulos(body.terminado)).toEqual([
      'FASE 6: cierre oficial completo',
      'cerrada hoy',
    ]);
  });

  it('en curso: las de una etapa `curso` de roles.yaml (esperar el PR no cuenta), con su bloqueo', async () => {
    const { body } = await dia();
    expect(
      body.enCurso.map(({ nodo, etapa, bloqueado }) => [
        nodo.titulo,
        etapa,
        bloqueado,
      ]),
    ).toEqual([
      ['codeando', 'EN CODIGO', false],
      ['FASE 3', 'AMARRAR 🧰', false],
      ['frenada', 'TESTEADO', true],
    ]);
    expect(body.limiteEnCurso).toBe(2);
  });

  it('detenido: las del tablero que algo frena, con qué; para decir: con su ritual', async () => {
    const { body } = await dia();
    expect(
      body.detenido.map(({ nodo, por }) => [nodo.titulo, titulos(por)]),
    ).toEqual([['frenada', ['¿pagina?']]]);
    expect(
      body.paraDecir.map(({ nodo, ritual }) => [nodo.titulo, ritual]),
    ).toEqual([['avisar del feriado', 'Daily']]);
  });

  it('trámites: los de cierre que siguen abiertos', async () => {
    const { body } = await dia();
    expect(titulos(body.tramites)).toEqual(['FASE 7: falta URL commit']);
  });

  it('`desde` en el futuro deja «terminé» vacío; una fecha inválida es 400', async () => {
    expect((await dia('?desde=2999-01-01')).body.terminado).toEqual([]);
    expect((await dia('?desde=ayer')).status).toBe(400);
  });
});
