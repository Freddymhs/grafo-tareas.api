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

  it('cierre pendiente: entregada → las casillas reales sin tildar; sin entregar, o sin cierre real (tracker: none) → null', () => {
    expect(leer('FASE_3_LISTA.md').cierrePendiente).toEqual([
      'URL commit',
      'Evidencias',
      'Wiki',
    ]);
    expect(leer('FASE_4_CERRADA.md').cierrePendiente).toEqual([]);
    expect(leer('FASE_2_EN_CODIGO.md').cierrePendiente).toBeNull();
    const entregadaSinTracker = md('FASE_2_EN_CODIGO.md').replace(
      '- [ ] Listo para PR',
      '- [x] Listo para PR',
    );
    expect(
      leerFase('FASE_2_EN_CODIGO.md', entregadaSinTracker, ROLES)
        .cierrePendiente,
    ).toBeNull();
  });

  it('nombre del archivo y task de **Azure** como fases.html; avance por rol', () => {
    const calidad = leer('FASE_5_CALIDAD.md');
    expect(calidad.nombre).toBe('Calidad');
    expect(calidad.avance).toBe(
      'entender ✓ · amarrar 1/1 · cambiar 1/2 · red 0/1 · PR ✗ · falta URL commit',
    );
    expect(leer('FASE_3_LISTA.md').avance).toBe(
      'entender ✓ · tareas 1/1 · colección ✓ · auditoría ✓ · PR ✓ · falta URL commit, Evidencias, Wiki',
    );
    expect(leer('FASE_2_EN_CODIGO.md').avance).toContain('colección —');
    const conTask = md('FASE_1_ENTENDIENDO.md').replace(
      '**Destraba**',
      '**Azure**: task **26307** «algo»\n**Destraba**',
    );
    expect(leerFase('FASE_1_ENTENDIENDO.md', conTask, ROLES).task).toBe(
      '26307',
    );
    expect(leer('FASE_1_ENTENDIENDO.md').task).toBeNull();
  });

  it('sin `# FASE n` ni número en el nombre, falla', () => {
    expect(() => leerFase('notas.md', '# Notas\n', ROLES)).toThrow('no tiene');
  });
});
