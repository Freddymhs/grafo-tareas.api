import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
import { Cara, EstadoNodo, type Nodo } from '@prisma/client';
import {
  conexionesDelArchivo,
  conexionesParaArchivo,
  nodoDelArchivo,
  nodoParaArchivo,
} from './archivo';

const nodo: Nodo = {
  id: '4cd9e2e3-1d61-4fbd-ab4a-b3884e4f6238',
  tipo: TIPO_NODO.TAREA,
  titulo: 'preguntas',
  descripcion: 'Archivada el 06-10',
  resumen: 'búsqueda rápida dentro de las muestras',
  estado: EstadoNodo.CERRADO,
  cara: Cara.PLAN,
  color: null,
  externoOrigen: 'fuente-externa',
  externoId: '6hhMVChrX8gjMWwc',
  proyectoId: '9c8a4f0e-1d2b-4c3a-8e5f-7a6b5c4d3e2f',
  etapa: '🔎 Precheck fin de sprint (archivadas)',
  etiquetas: ['retro'],
  prioridad: 4,
  vence: new Date('2026-10-20T00:00:00.000Z'),
  posX: 1.5,
  posY: 1.6,
  posZ: -2.5,
  fechaOrigen: new Date('2026-10-07T01:02:32.147Z'),
  createdAt: new Date('2026-10-17T03:52:23.449Z'),
  updatedAt: new Date('2026-10-18T01:00:00.000Z'),
};

describe('el archivo de un descarte (FASE 16) — se puede deshacer tal cual', () => {
  it('ida y vuelta: el nodo vuelve igual (mismo id, fechas, posición), salvo updatedAt', () => {
    const vuelto = nodoDelArchivo(nodoParaArchivo(nodo));
    const { updatedAt, ...sinActualizado } = nodo;
    expect(updatedAt).toBeInstanceOf(Date);
    expect(vuelto).toEqual(sinActualizado);
  });

  it('un descarte de antes de la FASE 17 (sin cara) vuelve a lo real', () => {
    const { cara, ...sinCara } = nodoParaArchivo(nodo);
    expect(cara).toBe(Cara.PLAN);
    expect(nodoDelArchivo(sinCara).cara).toBe(Cara.REAL);
  });

  it('un archivo dañado no se restaura a ciegas', () => {
    expect(() => nodoDelArchivo({ titulo: 'sin id' })).toThrow();
    expect(() => nodoDelArchivo('texto')).toThrow();
  });

  it('las conexiones van y vuelven', () => {
    const conexiones = [
      {
        origenId: 'a',
        destinoId: nodo.id,
        tipo: TIPO_CONEXION.DEPENDE_DE,
      },
    ];
    expect(conexionesDelArchivo(conexionesParaArchivo(conexiones))).toEqual(
      conexiones,
    );
  });
});
