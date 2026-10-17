import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerAbiertos } from './leer-abiertos';

const ENTENDIMIENTO = readFileSync(
  join(__dirname, '../../../test/fixtures/fases/Tareas/25699/entendimiento.md'),
  'utf8',
);

describe('leerAbiertos — solo las viñetas de ## ⚠️ ABIERTO', () => {
  const abiertos = leerAbiertos('25699', ENTENDIMIENTO);

  it('encuentra las 2 del fixture y no las de otras secciones', () => {
    expect(abiertos).toHaveLength(2);
    expect(abiertos.map(({ orden }) => orden)).toEqual([1, 2]);
  });

  it('el título va sin negritas ni la etiqueta [CÓDIGO]; el texto es la viñeta entera', () => {
    expect(abiertos[0]?.titulo).toBe(
      'Rastro de tipo de muestra en el POST (Q4). Lo acepta y lo guarda:',
    );
    expect(abiertos[0]?.texto).toContain('sigue en la línea siguiente');
    expect(abiertos[1]?.titulo).toBe(
      '¿Bloquear o restringir el laboratorio? Tomás decide.',
    );
  });

  it('sin sección ABIERTO no hay nada', () => {
    expect(leerAbiertos('1', '# x\n\n## Cerradas\n\n- a\n')).toEqual([]);
  });
});
