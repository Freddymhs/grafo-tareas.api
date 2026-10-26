import { TipoCambio } from '@prisma/client';
import { calcularUltimoCambio } from './calcular-ultimo-cambio';

const edicion = (
  nodoId: string,
  campo: string,
  despues: string | null,
  cuando: string,
) => ({
  nodoId,
  tipo: TipoCambio.EDICION,
  campo,
  despues,
  createdAt: new Date(cuando),
});

describe('calcularUltimoCambio — lo último que cambió en una página', () => {
  // La 26958 el 26-10 a las 20:24: una sola toma cambió cuatro campos a la vez.
  const tomada = [
    edicion('26958', 'titulo', '[26958] Revisión', '2026-10-26T20:24:08Z'),
    edicion('26958', 'cara', 'REAL', '2026-10-26T20:24:08Z'),
    edicion('26958', 'etiquetas', 'board, pieza', '2026-10-26T20:24:08Z'),
    edicion('26958', 'etapa', 'ENTENDIMIENTO', '2026-10-26T20:24:08Z'),
  ];
  const antes = edicion('26957', 'resumen', 'búsqueda', '2026-10-26T20:03:44Z');

  it('de varios campos en el mismo instante, el que más dice: «pasó a Trabajo», no «cambió etapa»', () => {
    expect(
      calcularUltimoCambio([antes, ...tomada], ['26957', '26958']),
    ).toEqual({
      nodoId: '26958',
      cuando: new Date('2026-10-26T20:24:08Z'),
      que: 'pasó a Trabajo',
    });
  });

  it('solo cuenta lo de la página', () => {
    expect(calcularUltimoCambio([antes, ...tomada], ['26957'])?.que).toBe(
      'cambió su resumen',
    );
  });

  it('cerrar, descartar y sin cambios', () => {
    const cierre = edicion('x', 'estado', 'CERRADO', '2026-10-26T21:00:00Z');
    expect(calcularUltimoCambio([cierre], ['x'])?.que).toBe('se cerró');
    const descarte = { ...cierre, tipo: TipoCambio.DESCARTE, campo: null };
    expect(calcularUltimoCambio([descarte], ['x'])?.que).toBe('se descartó');
    expect(calcularUltimoCambio([], ['x'])).toBeNull();
  });
});
