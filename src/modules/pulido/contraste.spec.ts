import { TipoCambio } from '@prisma/client';
import { calcularContraste } from './contraste';

const importado = (id: string, externoId: string, titulo = id) => ({
  id,
  externoOrigen: 'todoist',
  externoId,
  titulo,
});
const edicion = (nodoId: string, campo: string) => ({
  nodoId,
  tipo: TipoCambio.EDICION,
  campo,
  motivo: 'más claro',
});

describe('calcularContraste — Todoist ↔ grafo, desde el grafo (FASE 16)', () => {
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
        externoOrigen: 'todoist',
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
        externoOrigen: 'todoist',
        externoId: 'T2',
        titulo: 'b',
        estado: 'EDITADO',
        campos: ['etapa', 'titulo'],
        motivo: 'más claro',
      },
      {
        externoOrigen: 'todoist',
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
