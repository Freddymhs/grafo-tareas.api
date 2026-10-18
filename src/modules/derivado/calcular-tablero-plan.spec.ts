import { Cara, EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import {
  calcularTableroPlan,
  NodoDelTablero,
  TITULO_SIN_CARRIL,
} from './calcular-tablero-plan';

const nodo = (
  id: string,
  extra: Partial<NodoDelTablero> = {},
): NodoDelTablero => ({
  id,
  tipo: TipoNodo.TAREA,
  titulo: id,
  estado: EstadoNodo.ABIERTO,
  cara: Cara.PLAN,
  color: null,
  etiquetas: [],
  ...extra,
});
const carril = (id: string, titulo: string) =>
  nodo(id, {
    tipo: TipoNodo.RAMA,
    titulo,
    cara: Cara.REAL,
    color: '#0ea5e9',
    etiquetas: ['carril'],
  });
const enRonda = (id: string, ronda: number) =>
  nodo(id, {
    titulo: `${ronda} · ${id}`,
    etiquetas: ['pieza', `ronda:${ronda}`],
  });
const pertenece = (origenId: string, destinoId: string) => ({
  origenId,
  destinoId,
  tipo: TipoConexion.PERTENECE_A,
});

describe('calcularTableroPlan — el plan en columnas por carril, como el Draft (FASE 17)', () => {
  const nodos = [
    carril('a', '20379 · A · Bandeja'),
    carril('c', '20379 · C · Recepción'),
    nodo('color', {
      tipo: TipoNodo.RAMA,
      titulo: '🟢 Recepción',
      cara: Cara.REAL,
    }),
    enRonda('c-3', 3),
    enRonda('c-1', 1),
    enRonda('a-2', 2),
    enRonda('suelta', 2),
    nodo('cerrada', { estado: EstadoNodo.CERRADO }),
    nodo('real', { cara: Cara.REAL }),
  ];
  const conexiones = [
    pertenece('c-3', 'c'),
    pertenece('c-3', 'color'),
    pertenece('c-1', 'c'),
    pertenece('a-2', 'a'),
    pertenece('cerrada', 'a'),
    pertenece('real', 'a'),
    pertenece('suelta', 'color'),
  ];
  const tablero = calcularTableroPlan(nodos, conexiones);

  it('una columna por carril (la RAMA con la etiqueta carril), en orden de título; la rama de color no es columna', () => {
    expect(tablero.map(({ titulo }) => titulo)).toEqual([
      '20379 · A · Bandeja',
      '20379 · C · Recepción',
      TITULO_SIN_CARRIL,
    ]);
  });

  it('las piezas van en orden de ronda: primero la 1, después la 3', () => {
    expect(tablero[1].nodos).toEqual(['c-1', 'c-3']);
  });

  it('solo piezas abiertas del plan: ni lo cerrado ni lo real', () => {
    expect(tablero[0].nodos).toEqual(['a-2']);
  });

  it('la pieza sin carril va a «Sin carril», al final', () => {
    expect(tablero[2]).toMatchObject({ id: null, nodos: ['suelta'] });
  });

  it('sin piezas, sin columnas', () => {
    expect(calcularTableroPlan([carril('a', 'A')], [])).toEqual([]);
  });
});
