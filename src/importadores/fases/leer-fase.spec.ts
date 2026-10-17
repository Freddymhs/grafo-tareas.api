import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerRoles } from '../../modules/roles/leer-roles';
import { leerFase } from './leer-fase';

const FIXTURES = join(__dirname, '../../../test/fixtures/fases');
const BACKLOG = join(FIXTURES, 'backlog');
const ROLES = leerRoles(readFileSync(join(FIXTURES, 'roles.yaml'), 'utf8'));
const md = (nombre: string) => readFileSync(join(BACKLOG, nombre), 'utf8');
const leer = (nombre: string) => leerFase(nombre, md(nombre), ROLES);

describe('leerFase', () => {
  it('lee número, título, destraba y las FASE citadas en Dependencias (sin la propia)', () => {
    const fase = leer('FASE_2_EN_CODIGO.md');
    expect(fase.numero).toBe(2);
    expect(fase.titulo).toBe(
      'EN CÓDIGO — UNA TAREA HECHA, COLECCIÓN NO APLICA',
    );
    expect(fase.destraba).toBe('el flujo');
    expect(fase.dependencias).toEqual([1, 9]);
  });

  it('el rol sale de **Tipo**; sin la línea, el defecto', () => {
    expect(leer('FASE_2_EN_CODIGO.md').rol).toBe('producto');
    expect(leer('FASE_5_CALIDAD.md').rol).toBe('calidad');
  });

  it('la etapa es la columna del rol; una casilla «— no aplica» no cuenta como avance', () => {
    const fase = leer('FASE_2_EN_CODIGO.md');
    expect(fase.etapa).toBe('EN CODIGO');
    expect(fase.terminada).toBe(false);
    expect(leer('FASE_5_CALIDAD.md').etapa).toBe('CAMBIAR 🧰');
  });

  it('sin `# FASE n` ni número en el nombre, falla', () => {
    expect(() => leerFase('notas.md', '# Notas\n', ROLES)).toThrow('no tiene');
  });
});
