import { TipoConexion } from '@prisma/client';
import { calcularOrden } from './calcular-orden';
import type { CarrilDelPlan } from './calcular-tablero-plan';

const carril = (titulo: string, nodos: readonly string[]): CarrilDelPlan => ({
  id: titulo,
  titulo,
  color: '#0ea5e9',
  nodos,
});
const depende = (
  origenId: string,
  destinoId: string,
  tipo: TipoConexion = TipoConexion.DEPENDE_DE,
) => ({ origenId, destinoId, tipo });

// La HU 24576 del 26-10: A · Detalle (26957), B · Revisión (26958 → 26960 → 26961), C · Áreas (26963 → 26957).
const A = carril('A · Detalle', ['26957']);
const B = carril('B · Revisión', ['26958', '26960', '26961']);
const C = carril('C · Áreas', ['26963']);
const DEPENDENCIAS = [
  depende('26960', '26958'),
  depende('26961', '26960'),
  depende('26963', '26957'),
];

describe('calcularOrden — el número de cada pieza dentro de su carril, por sus DEPENDE_DE', () => {
  it('la HU 24576: A 26957=1 · B 26958=1, 26960=2, 26961=3 · C 26963=1', () => {
    const orden = calcularOrden([A, B, C], DEPENDENCIAS);
    expect(Object.fromEntries(orden)).toEqual({
      '26957': 1,
      '26958': 1,
      '26960': 2,
      '26961': 3,
      '26963': 1,
    });
  });

  it('esperar a otro carril no suma: eso lo dicen las pelotitas', () => {
    expect(
      calcularOrden([A, C], [depende('26963', '26957')]).get('26963'),
    ).toBe(1);
  });

  it('con dos previas en el carril, cuenta la cadena más larga', () => {
    const conRama = carril('B', ['b1', 'b2', 'b3', 'b4']);
    const orden = calcularOrden(
      [conRama],
      [
        depende('b2', 'b1'),
        depende('b3', 'b2'),
        depende('b4', 'b1'),
        depende('b4', 'b3'),
      ],
    );
    expect(orden.get('b4')).toBe(4);
  });

  it('solo cuenta DEPENDE_DE, y lo que ya no está en el plan no suma', () => {
    const orden = calcularOrden(
      [B],
      [
        depende('26960', '26958', TipoConexion.BLOQUEADA_POR),
        depende('26958', 'cerrada'),
      ],
    );
    expect(orden.get('26960')).toBe(1);
    expect(orden.get('26958')).toBe(1);
  });

  it('un ciclo no cuelga el cálculo', () => {
    const ciclo = carril('X', ['x1', 'x2']);
    const orden = calcularOrden(
      [ciclo],
      [depende('x1', 'x2'), depende('x2', 'x1')],
    );
    expect([...orden.values()].every((n) => Number.isFinite(n))).toBe(true);
  });
});
