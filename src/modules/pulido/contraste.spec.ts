import { TipoCambio } from '@prisma/client';
import { calcularContraste } from './contraste';

/** Una fuente cualquiera: el contraste no depende de cuál (la API no nombra herramientas). */
const ORIGEN_FUENTE = 'fuente-externa';

const importado = (id: string, externoId: string, titulo = id) => ({
  id,
  externoOrigen: ORIGEN_FUENTE,
  externoId,
  titulo,
});
const edicion = (nodoId: string, campo: string) => ({
  nodoId,
  tipo: TipoCambio.EDICION,
  campo,
  motivo: 'más claro',
});

describe('calcularContraste — fuente ↔ grafo, desde el grafo (FASE 16)', () => {
  const contraste = calcularContraste(
    [
      importado('a', 'T1'),
      importado('b', 'T2'),
      importado('c', 'T3'),
      {
        id: 'propio',
        externoOrigen: null,
        externoId: null,
        titulo: 'creado acá',
      },
    ],
    [
      {
        externoOrigen: ORIGEN_FUENTE,
        externoId: 'T4',
        titulo: 'preguntas',
        motivo: 'sin contenido',
      },
    ],
    [edicion('b', 'titulo'), edicion('b', 'etapa'), edicion('b', 'titulo')],
  );

  it('cuenta todo lo que vino de una fuente, con el denominador: iguales, editados y descartados', () => {
    expect(contraste.resumen).toEqual({
      total: 4,
      iguales: 2,
      editados: 1,
      descartados: 1,
    });
  });

  it('lista solo lo que difiere, con qué cambió y por qué', () => {
    expect(contraste.diferencias).toEqual([
      {
        externoOrigen: ORIGEN_FUENTE,
        externoId: 'T2',
        titulo: 'b',
        estado: 'EDITADO',
        campos: ['etapa', 'titulo'],
        motivo: 'más claro',
      },
      {
        externoOrigen: ORIGEN_FUENTE,
        externoId: 'T4',
        titulo: 'preguntas',
        estado: 'DESCARTADO',
        campos: [],
        motivo: 'sin contenido',
      },
    ]);
  });

  it('lo creado en el grafo no entra: no tiene contraparte en la fuente', () => {
    expect(contraste.diferencias.map(({ titulo }) => titulo)).not.toContain(
      'creado acá',
    );
  });
});
