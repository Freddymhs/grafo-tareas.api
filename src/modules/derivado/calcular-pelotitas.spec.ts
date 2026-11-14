import { TIPO_CONEXION } from '../../common/constants/tipos.constants.js';
import { calcularPelotitas } from './calcular-pelotitas';
import type { CarrilDelPlan } from './calcular-tablero-plan';

const carril = (
  titulo: string,
  color: string | null,
  nodos: readonly string[],
): CarrilDelPlan => ({ id: color ? titulo : null, titulo, color, nodos });
const depende = (
  origenId: string,
  destinoId: string,
  tipo: string = TIPO_CONEXION.DEPENDE_DE,
) => ({ origenId, destinoId, tipo });

// La HU 24576 del 26-10, en dos líneas: A · Detalle y áreas (26957 → 26963) y B · Revisión (26958 → 26960 → 26961);
// la 26963 además espera a la 26958, el 1 verde.
const AZUL = '#0ea5e9';
const VERDE = '#14b8a6';
const A = carril('A · Detalle y áreas', AZUL, ['26957', '26963']);
const B = carril('B · Revisión', VERDE, ['26958', '26960', '26961']);
const PLAN = [A, B];
const ORDEN = new Map([
  ['26957', 1],
  ['26963', 2],
  ['26958', 1],
  ['26960', 2],
  ['26961', 3],
]);
const carrilesDe = (pelotitas: readonly { carril: string }[] = []) =>
  pelotitas.map(({ carril: titulo }) => titulo);

describe('calcularPelotitas — la línea de cada pieza y las líneas que espera (el viejo tablero del plan)', () => {
  it('cada pieza lleva primero la pelotita de su carril, sin número de espera', () => {
    const pelotitas = calcularPelotitas(PLAN, [], ORDEN);
    expect(pelotitas.get('26957')).toEqual([
      { carril: 'A · Detalle y áreas', color: AZUL, espera: null },
    ]);
    expect(carrilesDe(pelotitas.get('26961'))).toEqual(['B · Revisión']);
  });

  it('la 26963 espera al 1 verde: su pelotita de B lleva ese número', () => {
    const pelotitas = calcularPelotitas(
      PLAN,
      [depende('26963', '26957'), depende('26963', '26958')],
      ORDEN,
    );
    expect(pelotitas.get('26963')).toEqual([
      { carril: 'A · Detalle y áreas', color: AZUL, espera: null },
      { carril: 'B · Revisión', color: VERDE, espera: 1 },
    ]);
  });

  it('depender del propio carril no suma pelotita', () => {
    const pelotitas = calcularPelotitas(
      PLAN,
      [depende('26960', '26958')],
      ORDEN,
    );
    expect(carrilesDe(pelotitas.get('26960'))).toEqual(['B · Revisión']);
  });

  it('dos tarjetas de la misma línea dan una pelotita, con el número de la última', () => {
    const pelotitas = calcularPelotitas(
      PLAN,
      [depende('26963', '26958'), depende('26963', '26961')],
      ORDEN,
    );
    expect(pelotitas.get('26963')?.[1]).toEqual({
      carril: 'B · Revisión',
      color: VERDE,
      espera: 3,
    });
  });

  it('depender de algo que ya no está en el plan (cerrado, otra HU) no frena: no suma', () => {
    const pelotitas = calcularPelotitas(
      PLAN,
      [depende('26963', 'cerrada')],
      ORDEN,
    );
    expect(carrilesDe(pelotitas.get('26963'))).toEqual(['A · Detalle y áreas']);
  });

  it('solo cuenta DEPENDE_DE: pertenecer o estar bloqueada no es esperar otra línea', () => {
    const pelotitas = calcularPelotitas(
      PLAN,
      [
        depende('26963', '26958', TIPO_CONEXION.PERTENECE_A),
        depende('26963', '26958', TIPO_CONEXION.BLOQUEADA_POR),
      ],
      ORDEN,
    );
    expect(carrilesDe(pelotitas.get('26963'))).toEqual(['A · Detalle y áreas']);
  });

  it('«Sin carril» no tiene color: su pieza no lleva pelotita propia, pero sí la del carril que espera', () => {
    const pelotitas = calcularPelotitas(
      [A, carril('Sin carril', null, ['x'])],
      [depende('x', '26957')],
      ORDEN,
    );
    expect(pelotitas.get('x')).toEqual([
      { carril: 'A · Detalle y áreas', color: AZUL, espera: 1 },
    ]);
  });
});
