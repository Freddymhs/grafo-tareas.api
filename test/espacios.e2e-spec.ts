import { opcionesCors } from '@config/cors.js';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './../src/app.module';
import {
  TIPO_CONEXION,
  TIPO_NODO,
} from './../src/common/constants/tipos.constants';
import { PrismaService } from './../src/database/prisma.service';
import {
  EspacioSembrado,
  sembrarEspacioTrabajo,
  vaciarBase,
} from './fixtures/sembrar-espacio';

interface Envuelto<T> {
  data: T;
}
interface ConId {
  id: string;
}
interface Nombrado extends ConId {
  nombre: string;
}

const PREFIJO = '/api/v1';
const ORIGEN_WEB = 'http://localhost:3001';

describe('Espacios, proyectos y tipos (e2e) — FASE 22', () => {
  const ctx = {} as {
    app: NestFastifyApplication;
    prisma: PrismaService;
    sembrado: EspacioSembrado;
  };

  const pedir = async <T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    payload?: object,
  ) => {
    const res = await ctx.app.inject({
      method,
      url: PREFIJO + url,
      payload,
    });
    const cuerpo = res.body ? (JSON.parse(res.body) as Envuelto<T>) : undefined;
    return { status: res.statusCode, body: cuerpo, headers: res.headers };
  };
  const nombres = (lista: Nombrado[]) => lista.map(({ nombre }) => nombre);

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
    await vaciarBase(ctx.prisma);
    ctx.sembrado = await sembrarEspacioTrabajo(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const ids: Record<string, string> = {};

  it('crea un espacio con plantilla maquinas: proyecto General y sus tipos', async () => {
    const creado = await pedir<Nombrado>('POST', '/espacios', {
      nombre: 'Mis máquinas',
      plantilla: 'maquinas',
    });
    expect(creado.status).toBe(201);
    ids.maquinas = creado.body!.data.id;

    const proyectos = await pedir<Nombrado[]>(
      'GET',
      `/espacios/${ids.maquinas}/proyectos`,
    );
    expect(nombres(proyectos.body!.data)).toEqual(['General']);
    ids.generalMaquinas = proyectos.body!.data[0].id;

    const tipos = await pedir<Nombrado[]>(
      'GET',
      `/espacios/${ids.maquinas}/tipos-nodo`,
    );
    expect(nombres(tipos.body!.data)).toEqual([
      'FAMILIA',
      'HERRAMIENTA',
      'MAQUINA',
    ]);
  });

  it('el mismo nombre de espacio dos veces → 409', async () => {
    const repetido = await pedir('POST', '/espacios', {
      nombre: 'Mis máquinas',
      plantilla: 'vacia',
    });
    expect(repetido.status).toBe(409);
  });

  it('archivar un espacio lo saca de la lista y vuelve con archivados=true', async () => {
    const creado = await pedir<Nombrado>('POST', '/espacios', {
      nombre: 'Para archivar',
      plantilla: 'vacia',
    });
    const archivado = await pedir(
      'PATCH',
      `/espacios/${creado.body!.data.id}`,
      {
        archivado: true,
      },
    );
    expect(archivado.status).toBe(200);

    const activos = await pedir<Nombrado[]>('GET', '/espacios');
    expect(nombres(activos.body!.data)).not.toContain('Para archivar');
    const todos = await pedir<Nombrado[]>('GET', '/espacios?archivados=true');
    expect(nombres(todos.body!.data)).toContain('Para archivar');
  });

  it('crea un proyecto en un espacio; el nombre repetido → 409', async () => {
    const creado = await pedir<Nombrado>(
      'POST',
      `/espacios/${ids.maquinas}/proyectos`,
      { nombre: 'ThinkPad' },
    );
    expect(creado.status).toBe(201);
    const repetido = await pedir(
      'POST',
      `/espacios/${ids.maquinas}/proyectos`,
      {
        nombre: 'ThinkPad',
      },
    );
    expect(repetido.status).toBe(409);
  });

  it('borrar un proyecto con nodos → 409; vacío → 200', async () => {
    await ctx.prisma.nodo.create({
      data: {
        tipo: TIPO_NODO.TAREA,
        titulo: 'ocupa el SAG',
        proyectoId: ctx.sembrado.proyectoSagId,
      },
    });
    const conNodos = await pedir(
      'DELETE',
      `/proyectos/${ctx.sembrado.proyectoSagId}`,
    );
    expect(conNodos.status).toBe(409);

    const vacio = await pedir<Nombrado>(
      'POST',
      `/espacios/${ids.maquinas}/proyectos`,
      { nombre: 'Vacío' },
    );
    const borrado = await pedir('DELETE', `/proyectos/${vacio.body!.data.id}`);
    expect(borrado.status).toBe(200);
  });

  it('POST /nodos sin proyectoId cae en el SAG con el aviso X-Aviso-Proyecto', async () => {
    const creado = await pedir<{ proyectoId: string }>('POST', '/nodos', {
      tipo: TIPO_NODO.TAREA,
      titulo: 'sin proyecto',
    });
    expect(creado.status).toBe(201);
    expect(creado.headers['x-aviso-proyecto']).toBe('por-defecto');
    expect(creado.body!.data.proyectoId).toBe(ctx.sembrado.proyectoSagId);
  });

  it('un tipo que el espacio no tiene → 400 con su nombre', async () => {
    const creado = await pedir<unknown>('POST', '/nodos', {
      tipo: 'MAQUINA',
      titulo: 'x',
      proyectoId: ctx.sembrado.proyectoGeneralId,
    });
    expect(creado.status).toBe(400);
    expect(JSON.stringify(creado.body)).toContain('MAQUINA');
  });

  it('un tipo sin ciclo guarda estado null aunque el cliente mande ABIERTO', async () => {
    const creado = await pedir<{ estado: string | null }>('POST', '/nodos', {
      tipo: 'HERRAMIENTA',
      titulo: 'buildworkspace',
      estado: 'ABIERTO',
      proyectoId: ids.generalMaquinas,
    });
    expect(creado.status).toBe(201);
    expect(creado.body!.data.estado).toBeNull();
  });

  it('mover un nodo a un espacio donde su tipo no existe → 409 y no se mueve', async () => {
    const tarea = await pedir<{ id: string }>('POST', '/nodos', {
      tipo: TIPO_NODO.TAREA,
      titulo: 'no se va',
      proyectoId: ctx.sembrado.proyectoSagId,
    });
    const movida = await pedir<unknown>(
      'PATCH',
      `/nodos/${tarea.body!.data.id}`,
      {
        proyectoId: ids.generalMaquinas,
      },
    );
    expect(movida.status).toBe(409);
    expect(JSON.stringify(movida.body)).toContain(TIPO_NODO.TAREA);
    const sigue = await pedir<{ proyectoId: string }>(
      'GET',
      `/nodos/${tarea.body!.data.id}`,
    );
    expect(sigue.body!.data.proyectoId).toBe(ctx.sembrado.proyectoSagId);
  });

  it('un nodo de un espacio archivado: ?q= lo encuentra, ?espacio= de otro no lo trae', async () => {
    const espacio = await pedir<{ id: string }>('POST', '/espacios', {
      nombre: 'Archivable',
      plantilla: 'empresa',
    });
    const proyectos = await pedir<{ id: string }[]>(
      'GET',
      `/espacios/${espacio.body!.data.id}/proyectos`,
    );
    await pedir('POST', '/nodos', {
      tipo: TIPO_NODO.TAREA,
      titulo: 'tarea única del archivado',
      proyectoId: proyectos.body!.data[0].id,
    });
    await pedir('PATCH', `/espacios/${espacio.body!.data.id}`, {
      archivado: true,
    });
    const porTexto = await pedir<{ data: { titulo: string }[] }>(
      'GET',
      '/nodos?q=tarea%20%C3%BAnica%20del%20archivado',
    );
    expect(porTexto.body!.data.data).toHaveLength(1);
    const delSigsa = await pedir<{ data: { titulo: string }[] }>(
      'GET',
      `/nodos?espacio=${ctx.sembrado.espacioId}`,
    );
    const titulos = delSigsa.body!.data.data.map(({ titulo }) => titulo);
    expect(titulos).not.toContain('tarea única del archivado');
  });

  describe('derivados desde las propiedades de los tipos (Tarea 6)', () => {
    interface Resumen extends ConId {
      titulo: string;
      proyectoId?: string;
    }
    const crearNodo = async (
      tipo: string,
      titulo: string,
      proyectoId: string,
    ) => {
      const res = await pedir<Resumen>('POST', '/nodos', {
        tipo,
        titulo,
        proyectoId,
      });
      return res.body!.data;
    };
    const conectar = (origenId: string, destinoId: string, tipo: string) =>
      pedir('POST', '/conexiones', { origenId, destinoId, tipo });
    const titulosHoyPuedo = async (consulta = '') => {
      const res = await pedir<Resumen[]>(
        'GET',
        `/derivado/hoy-puedo${consulta}`,
      );
      return res.body!.data.map(({ titulo }) => titulo);
    };

    it('los vecinos de un proyecto: lo de otros proyectos conectado a algo suyo, y nada suyo', async () => {
      const tarea = await crearNodo(
        TIPO_NODO.TAREA,
        'tarea con vecino',
        ctx.sembrado.proyectoSagId,
      );
      const herramienta = await crearNodo(
        'HERRAMIENTA',
        'herramienta vecina',
        ids.generalMaquinas,
      );
      await conectar(herramienta.id, tarea.id, TIPO_CONEXION.SE_RELACIONA_CON);
      const vecinos = await pedir<Resumen[]>(
        'GET',
        `/proyectos/${ctx.sembrado.proyectoSagId}/vecinos`,
      );
      expect(vecinos.status).toBe(200);
      const delVecindario = vecinos.body!.data;
      expect(delVecindario.map(({ titulo }) => titulo)).toEqual([
        'herramienta vecina',
      ]);
      expect(delVecindario[0].proyectoId).toBe(ids.generalMaquinas);
    });

    it('una HERRAMIENTA no aparece en hoy puedo', async () => {
      expect(await titulosHoyPuedo()).not.toContain('herramienta vecina');
    });

    it('una TAREA de un espacio archivado no aparece en hoy puedo; sin archivar, sí', async () => {
      const espacio = await pedir<ConId>('POST', '/espacios', {
        nombre: 'Empresa X',
        plantilla: 'empresa',
      });
      const proyectos = await pedir<ConId[]>(
        'GET',
        `/espacios/${espacio.body!.data.id}/proyectos`,
      );
      await crearNodo(
        TIPO_NODO.TAREA,
        'tarea de empresa x',
        proyectos.body!.data[0].id,
      );
      expect(await titulosHoyPuedo()).toContain('tarea de empresa x');
      await pedir('PATCH', `/espacios/${espacio.body!.data.id}`, {
        archivado: true,
      });
      expect(await titulosHoyPuedo()).not.toContain('tarea de empresa x');
    });

    it('un BLOQUEADA_POR hacia algo de un espacio archivado sigue bloqueando', async () => {
      const espacio = await pedir<ConId>('POST', '/espacios', {
        nombre: 'Empresa Y',
        plantilla: 'empresa',
      });
      const proyectos = await pedir<ConId[]>(
        'GET',
        `/espacios/${espacio.body!.data.id}/proyectos`,
      );
      const bloqueadora = await crearNodo(
        TIPO_NODO.TAREA,
        'bloqueadora archivada',
        proyectos.body!.data[0].id,
      );
      const bloqueada = await crearNodo(
        TIPO_NODO.TAREA,
        'bloqueada por archivada',
        ctx.sembrado.proyectoSagId,
      );
      await conectar(bloqueada.id, bloqueadora.id, TIPO_CONEXION.BLOQUEADA_POR);
      await pedir('PATCH', `/espacios/${espacio.body!.data.id}`, {
        archivado: true,
      });
      const res = await pedir<{ bloqueado: boolean }>(
        'GET',
        `/nodos/${bloqueada.id}/bloqueado`,
      );
      expect(res.body!.data.bloqueado).toBe(true);
      expect(await titulosHoyPuedo()).not.toContain('bloqueada por archivada');
    });

    it('hoy-puedo?espacio= no trae nodos de otro espacio', async () => {
      const otro = await pedir<ConId>('POST', '/espacios', {
        nombre: 'Empresa Z',
        plantilla: 'empresa',
      });
      const proyectos = await pedir<ConId[]>(
        'GET',
        `/espacios/${otro.body!.data.id}/proyectos`,
      );
      await crearNodo(
        TIPO_NODO.TAREA,
        'tarea de empresa z',
        proyectos.body!.data[0].id,
      );
      const delSigsa = await titulosHoyPuedo(
        `?espacio=${ctx.sembrado.espacioId}`,
      );
      expect(delSigsa).toContain('tarea con vecino');
      expect(delSigsa).not.toContain('tarea de empresa z');
    });
  });

  describe('la capa del método y las etapas por espacio (Tarea 7)', () => {
    it('un espacio sin método: el parte del día → 404', async () => {
      const res = await pedir<unknown>(
        'GET',
        `/derivado/dia?espacio=${ids.maquinas}`,
      );
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).toContain('no usa el método de trabajo');
    });

    it('sin ?espacio= el método responde como siempre (espacio del proyecto por defecto)', async () => {
      const dia = await pedir<unknown>('GET', '/derivado/dia');
      const roles = await pedir<unknown>('GET', '/roles');
      expect([dia.status, roles.status]).toEqual([200, 200]);
    });

    it('con ?espacio= de SIGSA el método responde', async () => {
      const dia = await pedir<unknown>(
        'GET',
        `/derivado/dia?espacio=${ctx.sembrado.espacioId}`,
      );
      expect(dia.status).toBe(200);
    });

    it('las etapas de un espacio empresa nuevo son Pendiente, Haciendo, Hecho', async () => {
      const espacio = await pedir<ConId>('POST', '/espacios', {
        nombre: 'Empresa con etapas',
        plantilla: 'empresa',
      });
      const etapas = await pedir<string[]>(
        'GET',
        `/etapas?espacio=${espacio.body!.data.id}`,
      );
      expect(etapas.body!.data).toEqual(['Pendiente', 'Haciendo', 'Hecho']);
    });

    it('una etapa que no es del espacio se rechaza al crear el nodo', async () => {
      const espacio = await pedir<ConId>('POST', '/espacios', {
        nombre: 'Empresa de etapa ajena',
        plantilla: 'empresa',
      });
      const proyectos = await pedir<ConId[]>(
        'GET',
        `/espacios/${espacio.body!.data.id}/proyectos`,
      );
      const proyectoId = proyectos.body!.data[0].id;
      const ajena = await pedir<unknown>('POST', '/nodos', {
        tipo: TIPO_NODO.TAREA,
        titulo: 'con etapa del método',
        etapa: 'ENTENDIMIENTO',
        proyectoId,
      });
      const propia = await pedir<unknown>('POST', '/nodos', {
        tipo: TIPO_NODO.TAREA,
        titulo: 'con etapa propia',
        etapa: 'Haciendo',
        proyectoId,
      });
      expect([ajena.status, propia.status]).toEqual([400, 201]);
    });
  });

  it('un tipo nuevo se crea por API, se usa sin tocar el esquema y, si es accionable, entra a hoy puedo', async () => {
    const espacio = await pedir<ConId>('POST', '/espacios', {
      nombre: 'Con tipo nuevo',
      plantilla: 'vacia',
    });
    const proyectos = await pedir<ConId[]>(
      'GET',
      `/espacios/${espacio.body!.data.id}/proyectos`,
    );
    const proyectoId = proyectos.body!.data[0].id;
    const antes = await pedir<unknown>('POST', '/nodos', {
      tipo: 'RECETA',
      titulo: 'paella',
      proyectoId,
    });
    expect(antes.status).toBe(400);

    const tipo = await pedir<ConId & { accionable: boolean }>(
      'POST',
      `/espacios/${espacio.body!.data.id}/tipos-nodo`,
      { nombre: 'RECETA' },
    );
    expect(tipo.status).toBe(201);
    expect(tipo.body!.data.accionable).toBe(false);
    const despues = await pedir<{ estado: string }>('POST', '/nodos', {
      tipo: 'RECETA',
      titulo: 'paella',
      proyectoId,
    });
    expect(despues.status).toBe(201);
    expect(despues.body!.data.estado).toBe('ABIERTO');
    const hoyAntes = await pedir<{ titulo: string }[]>(
      'GET',
      `/derivado/hoy-puedo?espacio=${espacio.body!.data.id}`,
    );
    expect(hoyAntes.body!.data).toEqual([]);

    await pedir('PATCH', `/tipos-nodo/${tipo.body!.data.id}`, {
      accionable: true,
    });
    const hoyDespues = await pedir<{ titulo: string }[]>(
      'GET',
      `/derivado/hoy-puedo?espacio=${espacio.body!.data.id}`,
    );
    expect(hoyDespues.body!.data.map(({ titulo }) => titulo)).toEqual([
      'paella',
    ]);
  });

  describe('arreglos de la revisión final (FASE 22)', () => {
    it('conectar con un tipo de conexión que no existe → 400 con su nombre, sin crear nada', async () => {
      const a = await pedir<ConId>('POST', '/nodos', {
        tipo: TIPO_NODO.TAREA,
        titulo: 'conexión: origen',
        proyectoId: ctx.sembrado.proyectoSagId,
      });
      const b = await pedir<ConId>('POST', '/nodos', {
        tipo: TIPO_NODO.TAREA,
        titulo: 'conexión: destino',
        proyectoId: ctx.sembrado.proyectoSagId,
      });
      const mal = await pedir<unknown>('POST', '/conexiones', {
        origenId: a.body!.data.id,
        destinoId: b.body!.data.id,
        tipo: 'BLOQUEADO_POR',
      });
      expect(mal.status).toBe(400);
      expect(JSON.stringify(mal.body)).toContain('BLOQUEADO_POR');
      expect(
        await ctx.prisma.conexion.count({
          where: { origenId: a.body!.data.id },
        }),
      ).toBe(0);
      const bien = await pedir<unknown>('POST', '/conexiones', {
        origenId: a.body!.data.id,
        destinoId: b.body!.data.id,
        tipo: TIPO_CONEXION.BLOQUEADA_POR,
      });
      expect(bien.status).toBe(201);
    });

    it('PATCH estado:null en un tipo con ciclo → 400 y el estado no cambia', async () => {
      const tarea = await pedir<ConId>('POST', '/nodos', {
        tipo: TIPO_NODO.TAREA,
        titulo: 'estado nulo',
        proyectoId: ctx.sembrado.proyectoSagId,
      });
      const mal = await pedir<unknown>(
        'PATCH',
        `/nodos/${tarea.body!.data.id}`,
        {
          estado: null,
        },
      );
      expect(mal.status).toBe(400);
      const sigue = await pedir<{ estado: string | null }>(
        'GET',
        `/nodos/${tarea.body!.data.id}`,
      );
      expect(sigue.body!.data.estado).toBe('ABIERTO');
    });
  });

  it('un tipo de conexión que ya existe → 409', async () => {
    const repetido = await pedir('POST', '/tipos-conexion', {
      nombre: 'BLOQUEADA_POR',
    });
    expect(repetido.status).toBe(409);
  });
});
