import { calcularLibera } from './calcular-libera';

const mapa = (pares: Record<string, readonly string[]>) =>
  new Map(Object.entries(pares));

describe('calcularLibera', () => {
  it('libera lo que solo esperaba al nodo cerrado', () => {
    const resultado = calcularLibera('persona', mapa({ duda: ['persona'] }));

    expect(resultado).toEqual({ directos: ['duda'], cadena: [] });
  });

  it('sigue la cadena: persona → duda → tareas', () => {
    const resultado = calcularLibera(
      'persona',
      mapa({ duda: ['persona'], t1: ['duda'], t2: ['duda'], t3: ['t1'] }),
    );

    expect(resultado.directos).toEqual(['duda']);
    expect(resultado.cadena).toEqual(['t1', 't2', 't3']);
  });

  it('no libera lo que además espera algo que sigue abierto', () => {
    const resultado = calcularLibera(
      'persona',
      mapa({ duda: ['persona'], t1: ['duda', 'otra-persona'] }),
    );

    expect(resultado).toEqual({ directos: ['duda'], cadena: [] });
  });

  it('termina con un ciclo y no libera a los que se esperan entre sí', () => {
    const resultado = calcularLibera('c', mapa({ a: ['b'], b: ['a', 'c'] }));

    expect(resultado).toEqual({ directos: [], cadena: [] });
  });

  it('sin nada aguas abajo, no libera nada', () => {
    expect(calcularLibera('solo', mapa({}))).toEqual({
      directos: [],
      cadena: [],
    });
  });
});
