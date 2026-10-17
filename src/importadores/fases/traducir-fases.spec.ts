import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { ETAPAS_POR_DEFECTO } from '../../common/constants/grafo.constants';
import { AbiertoLeido } from './leer-abiertos';
import { FaseLeida } from './leer-fase';
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
      tipo: TipoNodo.FASE,
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

  it('Dependencias → DEPENDE_DE solo hacia FASEs que están en el directorio', () => {
    expect(plan.conexiones).toEqual([
      {
        origenExternoId: externoFase(2),
        destinoExternoId: externoFase(1),
        tipo: TipoConexion.DEPENDE_DE,
      },
    ]);
  });

  it('cada ABIERTO es una DUDA con etiqueta `abierto` y el prefijo de su task', () => {
    expect(plan.dudas).toHaveLength(1);
    expect(plan.dudas[0]).toMatchObject({
      tipo: TipoNodo.DUDA,
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
      });
      expect(conTramites.conexiones).toContainEqual({
        origenExternoId: externoTramite(7),
        destinoExternoId: externoFase(7),
        tipo: TipoConexion.PERTENECE_A,
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
});
