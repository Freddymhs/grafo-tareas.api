import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { ETAPAS_POR_DEFECTO } from '../../common/constants/grafo.constants';
import { AbiertoLeido } from './leer-abiertos';
import { FaseLeida } from './leer-fase';
import { externoFase, traducirFases } from './traducir-fases';

const fase = (parcial: Partial<FaseLeida> & { numero: number }): FaseLeida => ({
  titulo: `título ${parcial.numero}`,
  destraba: null,
  rol: 'producto',
  dependencias: [],
  etapa: 'ENTENDIMIENTO',
  terminada: false,
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
});
