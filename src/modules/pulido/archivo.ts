import { Cara, EstadoNodo, Prisma, type Nodo } from '@prisma/client';

/** Una conexión archivada: lo justo para volver a crearla. */
export interface ConexionArchivada {
  readonly origenId: string;
  readonly destinoId: string;
  readonly tipo: string;
}

const fecha = (valor: Date | null) => (valor ? valor.toISOString() : null);

/** El nodo como JSON, campo por campo (las fechas en ISO): lo que guarda un descarte (FASE 16). */
export function nodoParaArchivo(nodo: Nodo): Prisma.InputJsonObject {
  return {
    id: nodo.id,
    tipo: nodo.tipo,
    titulo: nodo.titulo,
    descripcion: nodo.descripcion,
    resumen: nodo.resumen,
    estado: nodo.estado,
    cara: nodo.cara,
    color: nodo.color,
    externoOrigen: nodo.externoOrigen,
    externoId: nodo.externoId,
    proyectoId: nodo.proyectoId,
    etapa: nodo.etapa,
    etiquetas: nodo.etiquetas,
    prioridad: nodo.prioridad,
    vence: fecha(nodo.vence),
    posX: nodo.posX,
    posY: nodo.posY,
    posZ: nodo.posZ,
    fechaOrigen: fecha(nodo.fechaOrigen),
    createdAt: fecha(nodo.createdAt),
  };
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const texto = (valor: unknown): string | null =>
  typeof valor === 'string' ? valor : null;
const numero = (valor: unknown): number | null =>
  typeof valor === 'number' ? valor : null;
const fechaDe = (valor: unknown): Date | null =>
  typeof valor === 'string' ? new Date(valor) : null;
const esDe = <T extends string>(
  valores: Record<string, T>,
  valor: unknown,
): valor is T => Object.values<unknown>(valores).includes(valor);

/** Rearma el nodo archivado para volver a crearlo con su mismo id. Un archivo dañado no se restaura a ciegas. */
/** El `proyectoId` puede faltar: los descartes de antes de la FASE 22 no lo guardaron. */
export type NodoArchivado = Omit<Nodo, 'updatedAt' | 'proyectoId'> & {
  readonly proyectoId: string | null;
};

export function nodoDelArchivo(archivo: unknown): NodoArchivado {
  if (!esObjeto(archivo)) throw new Error('descarte dañado: no es un objeto');
  const { id, tipo, titulo, estado, fechaOrigen, createdAt, etiquetas } =
    archivo;
  const valido =
    typeof id === 'string' &&
    typeof titulo === 'string' &&
    typeof tipo === 'string' &&
    (estado === null || esDe(EstadoNodo, estado)) &&
    typeof fechaOrigen === 'string' &&
    typeof createdAt === 'string' &&
    Array.isArray(etiquetas);
  if (!valido)
    throw new Error(`descarte dañado: faltan campos de ${String(id)}`);
  return {
    id,
    tipo,
    titulo,
    descripcion: texto(archivo['descripcion']),
    // Los descartes de antes del 2026-10-26 no lo guardaron: no tenían.
    resumen: texto(archivo['resumen']),
    estado,
    // Los descartes de antes de la FASE 17 no la guardaron: eran todos de lo real.
    cara: esDe(Cara, archivo['cara']) ? archivo['cara'] : Cara.REAL,
    color: texto(archivo['color']),
    externoOrigen: texto(archivo['externoOrigen']),
    externoId: texto(archivo['externoId']),
    proyectoId: texto(archivo['proyectoId']),
    etapa: texto(archivo['etapa']),
    etiquetas: etiquetas.filter((e): e is string => typeof e === 'string'),
    prioridad: numero(archivo['prioridad']),
    vence: fechaDe(archivo['vence']),
    posX: numero(archivo['posX']),
    posY: numero(archivo['posY']),
    posZ: numero(archivo['posZ']),
    fechaOrigen: new Date(fechaOrigen),
    createdAt: new Date(createdAt),
  };
}

export function conexionesParaArchivo(
  conexiones: readonly ConexionArchivada[],
): Prisma.InputJsonArray {
  return conexiones.map(({ origenId, destinoId, tipo }) => ({
    origenId,
    destinoId,
    tipo,
  }));
}

export function conexionesDelArchivo(archivo: unknown): ConexionArchivada[] {
  if (!Array.isArray(archivo)) throw new Error('descarte dañado: conexiones');
  const lista: readonly unknown[] = archivo;
  return lista
    .filter(esObjeto)
    .flatMap(({ origenId, destinoId, tipo }) =>
      typeof origenId === 'string' &&
      typeof destinoId === 'string' &&
      typeof tipo === 'string'
        ? [{ origenId, destinoId, tipo }]
        : [],
    );
}
