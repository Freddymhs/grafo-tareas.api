import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { derivarEtapa, leerFase, terminada } from './leer-fase';

const BACKLOG = join(__dirname, '../../../test/fixtures/fases/backlog');
const md = (nombre: string) => readFileSync(join(BACKLOG, nombre), 'utf8');

describe('leerFase — la etapa sale de las casillas, como fases.html y calidad.html', () => {
  it('nada tildado → entendimiento; con una tarea hecha → codigo', () => {
    expect(derivarEtapa(md('FASE_1_ENTENDIENDO.md'))).toBe('entendimiento');
    expect(derivarEtapa(md('FASE_2_EN_CODIGO.md'))).toBe('codigo');
  });

  it('una casilla «— no aplica» no cuenta como avance', () => {
    const fase = leerFase('FASE_2_EN_CODIGO.md', md('FASE_2_EN_CODIGO.md'));
    expect(fase.etapa).toBe('codigo');
    expect(fase.terminada).toBe(false);
  });

  it('Listo para PR tildado → listo; cierre real tildado → aprobado; todo tildado → cerrado', () => {
    expect(derivarEtapa(md('FASE_3_LISTA.md'))).toBe('listo');
    const aprobada = md('FASE_4_CERRADA.md').replace(
      '- [x] Wiki actualizada',
      '- [ ] Wiki actualizada',
    );
    expect(derivarEtapa(aprobada)).toBe('aprobado');
    expect(derivarEtapa(md('FASE_4_CERRADA.md'))).toBe('cerrado');
    expect(terminada(md('FASE_4_CERRADA.md'))).toBe(true);
  });

  it('una FASE de calidad avanza por amarrar / cambiar / red y termina en pr', () => {
    const calidad = md('FASE_5_CALIDAD.md');
    expect(derivarEtapa(calidad)).toBe('cambiar');
    expect(derivarEtapa(calidad.replace('- [ ] Hook', '- [x] Hook'))).toBe(
      'red',
    );
    expect(
      derivarEtapa(
        calidad.replace('- [ ] Listo para PR', '- [x] Listo para PR'),
      ),
    ).toBe('pr');
  });

  it('lee número, título, destraba, tipo y las FASE citadas en Dependencias (sin la propia)', () => {
    const fase = leerFase('FASE_2_EN_CODIGO.md', md('FASE_2_EN_CODIGO.md'));
    expect(fase.numero).toBe(2);
    expect(fase.titulo).toBe(
      'EN CÓDIGO — UNA TAREA HECHA, COLECCIÓN NO APLICA',
    );
    expect(fase.destraba).toBe('el flujo');
    expect(fase.calidad).toBe(false);
    expect(fase.dependencias).toEqual([1, 9]);
    expect(leerFase('FASE_5_CALIDAD.md', md('FASE_5_CALIDAD.md')).calidad).toBe(
      true,
    );
  });

  it('sin `# FASE n` ni número en el nombre, falla', () => {
    expect(() => leerFase('notas.md', '# Notas\n')).toThrow('no tiene');
  });
});
