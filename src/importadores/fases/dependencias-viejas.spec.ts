import { dependenciasViejas, textoDeDependencia } from './dependencias-viejas';

describe('dependenciasViejas — lo que el grafo tiene y ningún .md declara (A.1, 2026-10-21)', () => {
  const dep = (origen: string, destino: string) => ({ origen, destino });

  it('devuelve las existentes que no están declaradas, y nada más', () => {
    const existentes = [dep('fase:38', 'fase:18'), dep('fase:39', 'fase:18')];
    const declaradas = [dep('fase:39', 'fase:18'), dep('fase:18', 'fase:38')];
    expect(dependenciasViejas(existentes, declaradas)).toEqual([
      dep('fase:38', 'fase:18'),
    ]);
  });

  it('la dirección cuenta: 18 → 38 declarada no cubre 38 → 18', () => {
    expect(
      dependenciasViejas(
        [dep('fase:38', 'fase:18')],
        [dep('fase:18', 'fase:38')],
      ),
    ).toHaveLength(1);
  });

  it('se lee origen → destino', () => {
    expect(textoDeDependencia(dep('fase:1', 'fase:3'))).toBe('fase:1 → fase:3');
  });
});
