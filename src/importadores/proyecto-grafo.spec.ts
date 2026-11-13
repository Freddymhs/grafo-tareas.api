import { BANDERA_PROYECTO_GRAFO, proyectoGrafoDe } from './proyecto-grafo';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('proyectoGrafoDe — el proyecto destino de un importador, siempre explícito', () => {
  it('sin la bandera falla antes de tocar nada, y el mensaje dice cuál falta', () => {
    expect(() => proyectoGrafoDe(['--seco'])).toThrow(BANDERA_PROYECTO_GRAFO);
  });

  it('con la bandera sin valor falla', () => {
    expect(() => proyectoGrafoDe([BANDERA_PROYECTO_GRAFO])).toThrow(
      BANDERA_PROYECTO_GRAFO,
    );
    expect(() => proyectoGrafoDe([BANDERA_PROYECTO_GRAFO, '--seco'])).toThrow(
      BANDERA_PROYECTO_GRAFO,
    );
  });

  it('con un valor que no es un uuid falla', () => {
    expect(() => proyectoGrafoDe([BANDERA_PROYECTO_GRAFO, 'SAG'])).toThrow(
      'uuid',
    );
  });

  it('con un uuid lo devuelve', () => {
    expect(proyectoGrafoDe(['--seco', BANDERA_PROYECTO_GRAFO, UUID])).toBe(
      UUID,
    );
  });
});
