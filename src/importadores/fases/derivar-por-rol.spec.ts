import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { leerRoles } from '../../modules/roles/leer-roles';
import { derivarEtapa, rolDeFase, terminada } from './derivar-por-rol';

const FIXTURES = join(__dirname, '../../../test/fixtures/fases');
const ROLES = leerRoles(readFileSync(join(FIXTURES, 'roles.yaml'), 'utf8'));
const md = (nombre: string) =>
  readFileSync(join(FIXTURES, 'backlog', nombre), 'utf8');
const etapa = (texto: string) =>
  derivarEtapa(texto, rolDeFase(texto, ROLES)).clave;

describe('derivarEtapa — la etapa sale de las casillas según el rol (como test_roles.py)', () => {
  it('producto: nada tildado → entendimiento; una tarea hecha → codigo', () => {
    expect(etapa(md('FASE_1_ENTENDIENDO.md'))).toBe('entendimiento');
    expect(etapa(md('FASE_2_EN_CODIGO.md'))).toBe('codigo');
  });

  it('producto: Listo para PR → listo; cierre real → aprobado; todo tildado → cerrado', () => {
    expect(etapa(md('FASE_3_LISTA.md'))).toBe('listo');
    const aprobada = md('FASE_4_CERRADA.md').replace(
      '- [x] Wiki actualizada',
      '- [ ] Wiki actualizada',
    );
    expect(etapa(aprobada)).toBe('aprobado');
    expect(etapa(md('FASE_4_CERRADA.md'))).toBe('cerrado');
    expect(terminada(md('FASE_4_CERRADA.md'))).toBe(true);
  });

  it('calidad: avanza por amarrar / cambiar / red y termina en pr', () => {
    const calidad = md('FASE_5_CALIDAD.md');
    expect(etapa(calidad)).toBe('cambiar');
    expect(etapa(calidad.replace('- [ ] Hook', '- [x] Hook'))).toBe('red');
    expect(
      etapa(calidad.replace('- [ ] Listo para PR', '- [x] Listo para PR')),
    ).toBe('pr');
  });

  it('una QA «— no aplica» tildada no es avance', () => {
    const noAplica = md('FASE_1_ENTENDIENDO.md').replace(
      '## QA\n',
      '## QA\n\n- [x] Listo para PR — no aplica (prueba)\n',
    );
    expect(etapa(noAplica)).toBe('entendimiento');
  });

  it('una marca que ningún rol tiene cae en el defecto; «funcional» es Producto', () => {
    expect(rolDeFase('**Tipo**: inventado\n', ROLES).clave).toBe('producto');
    expect(rolDeFase('**Tipo**: Funcional\n', ROLES).clave).toBe('producto');
  });
});
