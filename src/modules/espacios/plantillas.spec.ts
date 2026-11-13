import { PLANTILLAS } from './plantillas';

describe('plantillas de espacio', () => {
  it('maquinas no tiene tipos con ciclo', () => {
    const { tiposNodo } = PLANTILLAS.maquinas;
    expect(tiposNodo.length).toBeGreaterThan(0);
    expect(tiposNodo.every(({ tieneCiclo }) => !tieneCiclo)).toBe(true);
  });

  it('empresa marca solo TAREA como accionable', () => {
    const accionables = PLANTILLAS.empresa.tiposNodo
      .filter(({ accionable }) => accionable)
      .map(({ nombre }) => nombre);
    expect(accionables).toEqual(['TAREA']);
  });

  it('empresa trae las etapas Pendiente, Haciendo, Hecho', () => {
    expect(PLANTILLAS.empresa.etapas).toEqual([
      'Pendiente',
      'Haciendo',
      'Hecho',
    ]);
  });
});
