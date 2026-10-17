import { Prisma } from '@prisma/client';
import { ConexionPlan, NodoPlan } from './plan.js';

export type Tx = Prisma.TransactionClient;

export interface ConteoAplicado {
  readonly nodos: { readonly nuevos: number; readonly actualizados: number };
  readonly conexiones: { readonly nuevas: number; readonly existentes: number };
}

const CAMPOS_DEL_PLAN = {
  titulo: true,
  descripcion: true,
  estado: true,
  color: true,
  etapa: true,
  etiquetas: true,
  prioridad: true,
  vence: true,
} as const satisfies Prisma.NodoSelect;
type DatosDelPlan = Prisma.NodoGetPayload<{ select: typeof CAMPOS_DEL_PLAN }>;

const mismaFecha = (a: Date | null, b: Date | null) =>
  (a?.getTime() ?? null) === (b?.getTime() ?? null);

function iguales(guardado: DatosDelPlan, nuevo: DatosDelPlan): boolean {
  const { vence, etiquetas, ...resto } = nuevo;
  const mismasEtiquetas =
    guardado.etiquetas.length === etiquetas.length &&
    guardado.etiquetas.every((etiqueta, i) => etiqueta === etiquetas[i]);
  const mismoResto = (Object.keys(resto) as (keyof typeof resto)[]).every(
    (campo) => guardado[campo] === resto[campo],
  );
  return mismasEtiquetas && mismoResto && mismaFecha(guardado.vence, vence);
}

/**
 * Idempotente por `externo` (C3, D8): la segunda corrida no duplica, y **solo escribe lo que cambió**. Escribir
 * todo en cada corrida dejaba `updatedAt` con la fecha de la importación en todos los nodos, y «qué terminé hoy»
 * (FASE 10) no se podía leer: las 59 cerradas tenían fecha de hoy.
 */
export async function guardarNodo(
  tx: Tx,
  externoOrigen: string,
  nodo: NodoPlan,
) {
  const externo = { externoOrigen, externoId: nodo.externoId };
  const datos: DatosDelPlan = {
    titulo: nodo.titulo,
    descripcion: nodo.descripcion,
    estado: nodo.estado,
    color: nodo.color,
    etapa: nodo.etapa,
    etiquetas: [...nodo.etiquetas],
    prioridad: nodo.prioridad,
    vence: nodo.vence ? new Date(nodo.vence) : null,
  };
  const existente = await tx.nodo.findUnique({
    where: { externoOrigen_externoId: externo },
    select: { id: true, ...CAMPOS_DEL_PLAN },
  });
  if (existente) {
    const cambio = !iguales(existente, datos);
    if (cambio) {
      await tx.nodo.update({ where: { id: existente.id }, data: datos });
    }
    return { id: existente.id, creado: false, cambio };
  }
  const nuevo = await tx.nodo.create({
    data: { ...datos, tipo: nodo.tipo, ...externo },
    select: { id: true },
  });
  return { id: nuevo.id, creado: true, cambio: true };
}

export async function guardarConexion(
  tx: Tx,
  idPorExterno: ReadonlyMap<string, string>,
  conexion: ConexionPlan,
): Promise<boolean> {
  const origenId = idPorExterno.get(conexion.origenExternoId);
  const destinoId = idPorExterno.get(conexion.destinoExternoId);
  if (!origenId || !destinoId) {
    throw new Error(
      `El plan conecta ${conexion.origenExternoId} → ${conexion.destinoExternoId} pero falta un nodo`,
    );
  }
  return conectar(tx, { origenId, destinoId, tipo: conexion.tipo });
}

/** Crea la conexión si no existe. true = nueva. */
export async function conectar(
  tx: Tx,
  clave: { origenId: string; destinoId: string; tipo: ConexionPlan['tipo'] },
): Promise<boolean> {
  const existente = await tx.conexion.findUnique({
    where: { origenId_destinoId_tipo: clave },
    select: { id: true },
  });
  if (existente) return false;
  await tx.conexion.create({ data: clave });
  return true;
}

/** Aplica un plan entero: nodos (nuevos, y actualizados = los que cambiaron) y después conexiones. */
export async function aplicarPlan(
  tx: Tx,
  origen: string,
  nodos: readonly NodoPlan[],
  conexiones: readonly ConexionPlan[],
): Promise<ConteoAplicado & { idPorExterno: ReadonlyMap<string, string> }> {
  const idPorExterno = new Map<string, string>();
  const conteoNodos = { nuevos: 0, actualizados: 0 };
  for (const nodo of nodos) {
    const { id, creado, cambio } = await guardarNodo(tx, origen, nodo);
    idPorExterno.set(nodo.externoId, id);
    if (creado) conteoNodos.nuevos += 1;
    else if (cambio) conteoNodos.actualizados += 1;
  }
  const conteoConexiones = { nuevas: 0, existentes: 0 };
  for (const conexion of conexiones) {
    const creada = await guardarConexion(tx, idPorExterno, conexion);
    if (creada) conteoConexiones.nuevas += 1;
    else conteoConexiones.existentes += 1;
  }
  return { nodos: conteoNodos, conexiones: conteoConexiones, idPorExterno };
}
