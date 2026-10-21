import { cambiosDelDia, etiquetasDelDia } from './orden-del-dia';

describe('etiquetasDelDia', () => {
  it('saca el lugar de otro día y pone el de hoy al final', () => {
    expect(etiquetasDelDia(['board', 'hoy:3'], 1)).toEqual(['board', 'hoy:1']);
  });

  it('sin lugar (no va hoy): solo saca el de otro día', () => {
    expect(etiquetasDelDia(['hoy:2', 'board'], null)).toEqual(['board']);
  });

  it('no toca una etiqueta que solo se parece', () => {
    expect(etiquetasDelDia(['hoyo', 'ronda:1'], null)).toEqual([
      'hoyo',
      'ronda:1',
    ]);
  });
});

describe('cambiosDelDia', () => {
  const nodo = (id: string, etiquetas: string[]) => ({ id, etiquetas });

  it('numera en el orden pedido, borra el día anterior y no reescribe lo que no cambia', () => {
    const nodos = [
      nodo('a', ['board']),
      nodo('b', ['hoy:1']),
      nodo('c', ['hoy:2']),
      nodo('d', ['board']),
    ];
    expect(cambiosDelDia(nodos, ['c', 'a'])).toEqual([
      { id: 'a', etiquetas: ['board', 'hoy:2'] },
      { id: 'b', etiquetas: [] },
      { id: 'c', etiquetas: ['hoy:1'] },
    ]);
  });

  it('el mismo día otra vez no cambia nada', () => {
    expect(cambiosDelDia([nodo('a', ['hoy:1'])], ['a'])).toEqual([]);
  });
});
