import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
import { EstadoNodo } from '@prisma/client';
import {
  ETAPAS_POR_DEFECTO,
  ETIQUETA_MERGEADA,
} from '../../common/constants/grafo.constants';
import { AbiertoLeido } from './leer-abiertos';
import { FaseLeida } from './leer-fase';
import { ORIGEN_TRACKER, externoHistoria } from '../plan';
import { externoFase, externoTramite, traducirFases } from './traducir-fases';

const fase = (parcial: Partial<FaseLeida> & { numero: number }): FaseLeida => ({
  titulo: `título ${parcial.numero}`,
  nombre: '',
  task: null,
  avance: '',
  destraba: null,
  rol: 'producto',
  dependencias: [],
  etapa: 'ENTENDIMIENTO',
  terminada: false,
  mergeada: false,
  cierrePendiente: null,
  ...parcial,
});

describe('traducirFases', () => {
  const fases = [
    fase({ numero: 1, destraba: 'algo', etapa: 'EN CODIGO' }),
    fase({
      numero: 2,
      dependencias: [1, 9],
      etapa: 'CERRADO',
      terminada: true,
    }),
    fase({ numero: 3, rol: 'calidad', etapa: 'CAMBIAR 🧰' }),
  ];
  const abiertos: AbiertoLeido[] = [
    { taskId: '25699', orden: 1, titulo: 'duda', texto: 'duda larga' },
  ];
  const plan = traducirFases(fases, abiertos, ETAPAS_POR_DEFECTO, 'grafo');

  it('cada FASE es un nodo FASE titulado «FASE n», con su etapa, la etiqueta de su rol y el destraba en la descripción', () => {
    const [primera, segunda, tercera] = plan.nodos;
    expect(primera).toMatchObject({
      externoId: externoFase(1),
      tipo: TIPO_NODO.FASE,
      titulo: 'FASE 1',
      etapa: 'EN CODIGO',
      estado: EstadoNodo.ABIERTO,
      etiquetas: ['producto'],
    });
    expect(primera?.descripcion).toBe('FASE 1: título 1\nDestraba: algo');
    expect(segunda).toMatchObject({
      etapa: 'CERRADO',
      estado: EstadoNodo.CERRADO,
    });
    expect(tercera).toMatchObject({
      etapa: 'CAMBIAR 🧰',
      etiquetas: ['calidad'],
    });
  });

  it('la FASE mergeada lleva la etiqueta `mergeada` (FASE 17): la VR le pone el anillo', () => {
    const [mergeada] = traducirFases(
      [fase({ numero: 7, mergeada: true })],
      [],
      ETAPAS_POR_DEFECTO,
      'grafo',
    ).nodos;
    expect(mergeada?.etiquetas).toEqual(['producto', ETIQUETA_MERGEADA]);
    expect(plan.nodos[0]?.etiquetas).not.toContain(ETIQUETA_MERGEADA);
  });

  it('Dependencias → DEPENDE_DE solo hacia FASEs que están en el directorio', () => {
    expect(plan.conexiones).toEqual([
      {
        origenExternoId: externoFase(2),
        destinoExternoId: externoFase(1),
        tipo: TIPO_CONEXION.DEPENDE_DE,
      },
    ]);
  });

  it('cada ABIERTO es una DUDA con etiqueta `abierto` y el prefijo de su task', () => {
    expect(plan.dudas).toHaveLength(1);
    expect(plan.dudas[0]).toMatchObject({
      tipo: TIPO_NODO.DUDA,
      titulo: 'duda',
      etiquetas: ['abierto'],
      tareaPrefijo: '[25699]',
      externoId: 'abierto:25699:1',
    });
  });

  it('el origen lleva el proyecto: dos orquestadores no comparten nodos FASE', () => {
    expect(plan.origen).toBe('fases-md:grafo');
    expect(traducirFases(fases, [], ETAPAS_POR_DEFECTO, 'lab').origen).toBe(
      'fases-md:lab',
    );
  });

  it('una etapa que la API no conoce frena la importación con el nombre que falta', () => {
    expect(() => traducirFases(fases, [], ['ENTENDIMIENTO'], 'grafo')).toThrow(
      '«EN CODIGO»',
    );
  });

  describe('trámites de cierre (FASE 10)', () => {
    const TRAMITE = 'complemento:tramite';
    const entregadas = [
      fase({ numero: 7, cierrePendiente: ['URL commit', 'Evidencias'] }),
      fase({ numero: 8, cierrePendiente: [] }),
      fase({ numero: 9 }),
    ];
    const conTramites = traducirFases(
      entregadas,
      [],
      ETAPAS_POR_DEFECTO,
      'grafo',
      TRAMITE,
    );
    const tramite = (numero: number) =>
      conTramites.nodos.find(
        ({ externoId }) => externoId === externoTramite(numero),
      );

    it('una FASE entregada con el cierre pendiente deja un trámite abierto que dice qué falta', () => {
      expect(tramite(7)).toMatchObject({
        titulo: 'FASE 7: falta URL commit, Evidencias',
        estado: EstadoNodo.ABIERTO,
        etiquetas: [TRAMITE],
        // A la derecha de CERRADO: lo que falta después de cerrar (Freddy, 2026-10-18).
        etapa: 'TRÁMITES DE CIERRE',
      });
      expect(conTramites.conexiones).toContainEqual({
        origenExternoId: externoTramite(7),
        destinoExternoId: externoFase(7),
        tipo: TIPO_CONEXION.PERTENECE_A,
      });
    });

    it('con el cierre completo el trámite queda cerrado; sin entregar, no hay trámite', () => {
      expect(tramite(8)?.estado).toBe(EstadoNodo.CERRADO);
      expect(tramite(9)).toBeUndefined();
    });

    it('sin el trámite en el catálogo del área, no se crea ninguno', () => {
      const sinCatalogo = traducirFases(
        entregadas,
        [],
        ETAPAS_POR_DEFECTO,
        'grafo',
      );
      expect(sinCatalogo.nodos).toHaveLength(entregadas.length);
    });
  });
  describe('HU (FASE 13, R1-R2): cada FASE cuelga de la HU padre de su task', () => {
    const padres = {
      tareas: { '24972': '19565', '24973': '19565', '25476': '20379' },
      padres: { '19565': 'Registrar Toma de Muestras', '20379': 'Dashboard' },
    };
    const conTask = [
      fase({ numero: 10, task: '24972' }),
      fase({ numero: 9, task: '24973' }),
      fase({ numero: 32, task: '25476' }),
      fase({ numero: 36, task: null }),
      fase({ numero: 40, task: '99999' }),
    ];
    const plan = traducirFases(
      conTask,
      [],
      ETAPAS_POR_DEFECTO,
      'sag',
      null,
      padres,
    );
    const historias = plan.nodos.filter(
      ({ tipo }) => tipo === TIPO_NODO.HISTORIA,
    );

    it('una HU por padre, con su título real y de origen tracker; ésta manda (soloSiFalta: false)', () => {
      expect(historias.map(({ externoId }) => externoId).sort()).toEqual([
        externoHistoria('19565'),
        externoHistoria('20379'),
      ]);
      const hu = historias.find(
        ({ externoId }) => externoId === externoHistoria('19565'),
      );
      expect(hu).toMatchObject({
        titulo: 'HU 19565 · Registrar Toma de Muestras',
        origen: ORIGEN_TRACKER,
        soloSiFalta: false,
      });
    });

    it('la FASE PERTENECE_A su HU; sin task o sin padre conocido, queda sin HU', () => {
      const deHu = plan.conexiones.filter(
        ({ tipo, destinoExternoId }) =>
          tipo === TIPO_CONEXION.PERTENECE_A &&
          destinoExternoId.startsWith('hu:'),
      );
      expect(deHu).toEqual([
        {
          origenExternoId: externoFase(10),
          destinoExternoId: externoHistoria('19565'),
          tipo: TIPO_CONEXION.PERTENECE_A,
        },
        {
          origenExternoId: externoFase(9),
          destinoExternoId: externoHistoria('19565'),
          tipo: TIPO_CONEXION.PERTENECE_A,
        },
        {
          origenExternoId: externoFase(32),
          destinoExternoId: externoHistoria('20379'),
          tipo: TIPO_CONEXION.PERTENECE_A,
        },
      ]);
    });

    it('sin mapa de padres, no hay HU (el mapa sale del tracker, no de la prosa de la FASE)', () => {
      const sinMapa = traducirFases(conTask, [], ETAPAS_POR_DEFECTO, 'sag');
      expect(
        sinMapa.nodos.some(({ tipo }) => tipo === TIPO_NODO.HISTORIA),
      ).toBe(false);
    });
  });
});
