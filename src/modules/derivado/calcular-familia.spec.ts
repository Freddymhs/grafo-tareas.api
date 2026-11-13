import { TIPO_CONEXION } from '../../common/constants/tipos.constants.js';
import { calcularFamilia } from './calcular-familia';

const { PERTENECE_A, BLOQUEADA_POR } = TIPO_CONEXION;
const enlace = (origenId: string, tipo: string, destinoId: string) => ({
  origenId,
  destinoId,
  tipo,
});
const conexiones = [
  enlace('fase', PERTENECE_A, 'hu'),
  enlace('tarjeta', PERTENECE_A, 'fase'),
  enlace('tarjeta', PERTENECE_A, 'rama'),
  enlace('tarjeta', BLOQUEADA_POR, 'duda'),
  enlace('otra-fase', PERTENECE_A, 'otra-hu'),
];
const familia = (id: string) => calcularFamilia(id, conexiones).sort();

describe('calcularFamilia — lo que se ilumina al seleccionar (FASE 15)', () => {
  it('una HU: ella, sus FASE y las tarjetas de esas FASE', () => {
    expect(familia('hu')).toEqual(['fase', 'hu', 'tarjeta']);
  });

  it('una tarjeta: ella y con qué se conecta directo (su FASE, su rama, lo que la bloquea)', () => {
    expect(familia('tarjeta')).toEqual(['duda', 'fase', 'rama', 'tarjeta']);
  });

  it('lo de otra HU no entra', () => {
    expect(familia('hu')).not.toContain('otra-fase');
  });

  it('un nodo sin conexiones es solo él', () => {
    expect(familia('suelto')).toEqual(['suelto']);
  });
});
