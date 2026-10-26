import { diferencias } from './diferencias';

const antes = {
  titulo: 'preguntas',
  descripcion: null,
  resumen: null,
  estado: 'ABIERTO',
  cara: 'PLAN',
  etapa: 'ENTENDIMIENTO',
  etiquetas: ['retro'],
  prioridad: 4,
  vence: new Date('2026-10-20T00:00:00.000Z'),
  color: null,
};

describe('diferencias — qué anota la bitácora de una edición (FASE 16)', () => {
  it('solo lo que cambió de verdad, con su antes y su después como texto', () => {
    expect(
      diferencias(antes, {
        titulo: 'Preguntas para Tomás',
        etapa: 'ENTENDIMIENTO',
        etiquetas: ['retro', 'cierre'],
      }),
    ).toEqual([
      { campo: 'titulo', antes: 'preguntas', despues: 'Preguntas para Tomás' },
      { campo: 'etiquetas', antes: 'retro', despues: 'retro, cierre' },
    ]);
  });

  it('lo que no viene no cuenta; la misma fecha en otro formato tampoco', () => {
    expect(diferencias(antes, { vence: '2026-10-20' })).toEqual([]);
    expect(diferencias(antes, {})).toEqual([]);
  });

  it('pasar del plan a lo real queda en la bitácora (FASE 17)', () => {
    expect(diferencias(antes, { cara: 'REAL' })).toEqual([
      { campo: 'cara', antes: 'PLAN', despues: 'REAL' },
    ]);
  });

  it('vaciar un campo es un cambio', () => {
    expect(diferencias(antes, { etapa: null })).toEqual([
      { campo: 'etapa', antes: 'ENTENDIMIENTO', despues: null },
    ]);
  });
});
