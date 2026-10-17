import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import {
  PAGINA_SIN_HU,
  calcularPaginas,
  type ConexionDePagina,
  type NodoDePagina,
} from './calcular-paginas';

const nodo = (
  id: string,
  tipo: TipoNodo,
  estado: EstadoNodo = EstadoNodo.ABIERTO,
): NodoDePagina => ({ id, tipo, titulo: id, estado });
const conexion = (
  origenId: string,
  tipo: TipoConexion,
  destinoId: string,
): ConexionDePagina => ({ origenId, destinoId, tipo });
const { PERTENECE_A, BLOQUEADA_POR, ESPERA_RESPUESTA_DE, DEPENDE_DE } =
  TipoConexion;

/** Dos HU como las del SAG: el árbol HU → FASE → tarjeta, una pieza del Draft, ramas y lo que bloquea. */
const nodos: NodoDePagina[] = [
  nodo('HU 20379', TipoNodo.HISTORIA),
  nodo('HU 19565', TipoNodo.HISTORIA),
  nodo('fase-a', TipoNodo.FASE),
  nodo('tarjeta-a', TipoNodo.TAREA),
  nodo('cerrada-a', TipoNodo.TAREA, EstadoNodo.CERRADO),
  nodo('pieza-a', TipoNodo.TAREA),
  nodo('fase-b', TipoNodo.FASE),
  nodo('tarjeta-b', TipoNodo.TAREA),
  nodo('hija-de-b', TipoNodo.TAREA),
  nodo('duda', TipoNodo.DUDA),
  nodo('persona', TipoNodo.PERSONA),
  nodo('rama-azul', TipoNodo.RAMA),
  nodo('nota-suelta', TipoNodo.TAREA),
];
const conexiones: ConexionDePagina[] = [
  conexion('fase-a', PERTENECE_A, 'HU 19565'),
  conexion('tarjeta-a', PERTENECE_A, 'fase-a'),
  conexion('cerrada-a', PERTENECE_A, 'fase-a'),
  conexion('pieza-a', PERTENECE_A, 'HU 19565'),
  conexion('tarjeta-a', PERTENECE_A, 'rama-azul'),
  conexion('tarjeta-a', BLOQUEADA_POR, 'duda'),
  conexion('duda', ESPERA_RESPUESTA_DE, 'persona'),
  conexion('fase-b', PERTENECE_A, 'HU 20379'),
  conexion('tarjeta-b', PERTENECE_A, 'fase-b'),
  conexion('hija-de-b', PERTENECE_A, 'tarjeta-b'),
  conexion('tarjeta-a', DEPENDE_DE, 'tarjeta-b'),
];

describe('calcularPaginas — una página por HU (FASE 15, «la API decide»)', () => {
  const paginas = calcularPaginas(nodos, conexiones);
  const pagina = (id: string) => paginas.find((p) => p.id === id);
  const contenido = (id: string) => [...(pagina(id)?.nodos ?? [])].sort();

  it('una página por HU, ordenadas por número, y «Sin HU» al final', () => {
    expect(paginas.map(({ id }) => id)).toEqual([
      'HU 19565',
      'HU 20379',
      PAGINA_SIN_HU,
    ]);
    expect(pagina('HU 19565')?.historiaId).toBe('HU 19565');
    expect(pagina(PAGINA_SIN_HU)?.historiaId).toBeNull();
  });

  it('la HU trae su árbol: sus FASE, las tarjetas de esas FASE y las piezas que le pertenecen', () => {
    expect(contenido('HU 20379')).toEqual([
      'HU 20379',
      'fase-b',
      'hija-de-b',
      'tarjeta-b',
    ]);
    expect(contenido('HU 19565')).toEqual(
      expect.arrayContaining([
        'HU 19565',
        'fase-a',
        'tarjeta-a',
        'cerrada-a',
        'pieza-a',
      ]),
    );
  });

  it('y lo que bloquea a lo suyo: la duda, a quién espera esa duda y de qué depende (un salto)', () => {
    expect(contenido('HU 19565')).toEqual(
      expect.arrayContaining(['duda', 'persona', 'tarjeta-b']),
    );
    expect(contenido('HU 19565')).not.toContain('hija-de-b');
  });

  it('las ramas no son página ni contenido: son el color (la leyenda las explica)', () => {
    paginas.forEach(({ nodos: ids }) => expect(ids).not.toContain('rama-azul'));
  });

  it('«Sin HU» junta lo que ninguna HU trae', () => {
    expect(contenido(PAGINA_SIN_HU)).toEqual(['nota-suelta']);
  });

  it('cuenta las tareas abiertas de cada página (para la pestaña)', () => {
    expect(pagina('HU 19565')?.abiertas).toBe(3);
    expect(pagina('HU 20379')?.abiertas).toBe(2);
  });

  it('sin nada suelto no hay página «Sin HU», y un ciclo de pertenencias no la cuelga', () => {
    const conCiclo = calcularPaginas(
      [
        nodo('HU 1', TipoNodo.HISTORIA),
        nodo('x', TipoNodo.TAREA),
        nodo('y', TipoNodo.TAREA),
      ],
      [
        conexion('x', PERTENECE_A, 'HU 1'),
        conexion('y', PERTENECE_A, 'x'),
        conexion('x', PERTENECE_A, 'y'),
      ],
    );
    expect(conCiclo.map(({ id }) => id)).toEqual(['HU 1']);
    expect([...conCiclo[0].nodos].sort()).toEqual(['HU 1', 'x', 'y']);
  });
});
