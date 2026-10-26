import { TipoConexion } from '@prisma/client';
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
  tipo: TipoConexion = TipoConexion.DEPENDE_DE,
) => ({ origenId, destinoId, tipo });

// La HU 24576 del 26-10: A · Detalle (1.1), B · Revisión (2.1 → 2.2 → 2.4), C · Áreas (3.1 → 1.1).
const A = carril('A · Detalle', '#0ea5e9', ['1.1']);
const B = carril('B · Revisión', '#14b8a6', ['2.1', '2.2', '2.4']);
const C = carril('C · Áreas', '#eab308', ['3.1']);
const PLAN = [A, B, C];
const carrilesDe = (pelotitas: readonly { carril: string }[] = []) =>
  pelotitas.map(({ carril: titulo }) => titulo);

describe('calcularPelotitas — la línea de cada pieza y las líneas que espera (el viejo Draft de Todoist)', () => {
  it('cada pieza lleva primero la pelotita de su carril', () => {
    const pelotitas = calcularPelotitas(PLAN, []);
    expect(pelotitas.get('1.1')).toEqual([
      { carril: 'A · Detalle', color: '#0ea5e9' },
    ]);
    expect(carrilesDe(pelotitas.get('2.4'))).toEqual(['B · Revisión']);
  });

  it('suma una pelotita por cada OTRO carril del que depende; depender del propio no suma', () => {
    const pelotitas = calcularPelotitas(PLAN, [
      depende('3.1', '1.1'),
      depende('2.2', '2.1'),
    ]);
    expect(carrilesDe(pelotitas.get('3.1'))).toEqual([
      'C · Áreas',
      'A · Detalle',
    ]);
    expect(carrilesDe(pelotitas.get('2.2'))).toEqual(['B · Revisión']);
  });

  it('dos dependencias al mismo carril dan una sola pelotita', () => {
    const conDosEnA = [carril('A · Detalle', '#0ea5e9', ['1.1', '1.2']), B];
    const pelotitas = calcularPelotitas(conDosEnA, [
      depende('2.2', '1.1'),
      depende('2.2', '1.2'),
    ]);
    expect(carrilesDe(pelotitas.get('2.2'))).toEqual([
      'B · Revisión',
      'A · Detalle',
    ]);
  });

  it('depender de algo que ya no está en el plan (cerrado, otra HU) no frena: no suma', () => {
    const pelotitas = calcularPelotitas(PLAN, [depende('3.1', 'cerrada')]);
    expect(carrilesDe(pelotitas.get('3.1'))).toEqual(['C · Áreas']);
  });

  it('solo cuenta DEPENDE_DE: pertenecer o estar bloqueada no es esperar otra línea', () => {
    const pelotitas = calcularPelotitas(PLAN, [
      depende('3.1', '1.1', TipoConexion.PERTENECE_A),
      depende('3.1', '1.1', TipoConexion.BLOQUEADA_POR),
    ]);
    expect(carrilesDe(pelotitas.get('3.1'))).toEqual(['C · Áreas']);
  });

  it('«Sin carril» no tiene color: su pieza no lleva pelotita propia, pero sí la del carril que espera', () => {
    const pelotitas = calcularPelotitas(
      [A, carril('Sin carril', null, ['x'])],
      [depende('x', '1.1')],
    );
    expect(carrilesDe(pelotitas.get('x'))).toEqual(['A · Detalle']);
  });
});
