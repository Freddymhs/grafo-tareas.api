import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerArea } from './leer-area';

const TEXTO = readFileSync(
  join(__dirname, '../../../test/fixtures/fases/refs.yaml'),
  'utf8',
);

describe('leerArea', () => {
  it('lee las escaleras en orden y los rituales; ignora el resto de refs.yaml', () => {
    const { escaleras, rituales } = leerArea(TEXTO);
    expect(escaleras).toEqual([
      {
        clave: 'negocio',
        antes: 'contrastar con el código',
        personas: ['Analista', 'Senior Back'],
      },
      { clave: 'codigo', antes: null, personas: ['Senior Back', 'Analista'] },
    ]);
    expect(rituales.map(({ clave }) => clave)).toEqual(['daily', 'uno-a-uno']);
  });

  it('un refs.yaml sin escalera ni rituales da un área vacía', () => {
    expect(leerArea('proyecto: x\n')).toEqual({
      escaleras: [],
      rituales: [],
      personas: [],
    });
  });

  it('lee las personas en el orden del archivo, cada una con sus alias (son del área, no del código)', () => {
    expect(leerArea(TEXTO).personas).toEqual([
      { nombre: 'Senior Back', alias: ['Senior Back', 'el senior'] },
      { nombre: 'Analista', alias: ['Analista', 'la analista'] },
    ]);
    expect(() =>
      leerArea(TEXTO.replace('[Analista, la analista]', '[]')),
    ).toThrow('refs.yaml inválido');
  });

  it('una escalera desconocida o sin personas falla con el motivo', () => {
    expect(() => leerArea(TEXTO.replace('codigo: {', 'chisme: {'))).toThrow(
      'refs.yaml inválido',
    );
    expect(() =>
      leerArea(
        TEXTO.replace('personas: [Senior Back, Analista]', 'personas: []'),
      ),
    ).toThrow('refs.yaml inválido');
  });
});
