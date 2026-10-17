import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerRoles } from './leer-roles';

const TEXTO = readFileSync(
  join(__dirname, '../../../test/fixtures/fases/roles.yaml'),
  'utf8',
);

describe('leerRoles', () => {
  it('lee los roles en el orden del archivo, con sus grupos en orden', () => {
    const { defecto, roles } = leerRoles(TEXTO);
    expect(defecto).toBe('producto');
    expect(roles.map(({ clave }) => clave)).toEqual(['producto', 'calidad']);
    const calidad = roles[1];
    expect(calidad?.grupos.map(({ clave }) => clave)).toEqual([
      'amarrar',
      'red',
      'cambiar',
    ]);
  });

  it('un defecto que no es un rol falla con el motivo', () => {
    expect(() =>
      leerRoles(TEXTO.replace('defecto: producto', 'defecto: nadie')),
    ).toThrow('defecto «nadie» no es un rol');
  });

  it('una marca en dos roles falla', () => {
    expect(() =>
      leerRoles(TEXTO.replace('marcas: [calidad]', 'marcas: [producto]')),
    ).toThrow('la marca «producto»');
  });

  it('una etapa que usa un grupo que no existe falla', () => {
    expect(() =>
      leerRoles(TEXTO.replace('si: { grupo: red }', 'si: { grupo: rojo }')),
    ).toThrow('«rojo»');
  });

  it('una condición desconocida o otra versión fallan', () => {
    expect(() =>
      leerRoles(TEXTO.replace('si: tareas_alguna', 'si: a_veces')),
    ).toThrow('roles.yaml inválido');
    expect(() => leerRoles(TEXTO.replace('version: 1', 'version: 2'))).toThrow(
      'roles.yaml inválido',
    );
  });
});
