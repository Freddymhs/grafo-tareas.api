import { Prisma } from '@prisma/client';
import { ConexionPlan, NodoPlan } from './plan.js';

export type Tx = Prisma.TransactionClient;

export interface ConteoAplicado {
  readonly nodos: { readonly nuevos: number; readonly actualizados: number };
  readonly conexiones: { readonly nuevas: number; readonly existentes: number };
}

/** Idempotente por `externo` (C3, D8): la segunda corrida actualiza, no duplica. */
export async function guardarNodo(
  tx: Tx,
  externoOrigen: string,
  nodo: NodoPlan,
) {
  const externo = { externoOrigen, externoId: nodo.externoId };
  const datos = {
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
    select: { id: true },
  });
  if (existente) {
    await tx.nodo.update({ where: { id: existente.id }, data: datos });
    return { id: existente.id, creado: false };
  }
  const nuevo = await tx.nodo.create({
    data: { ...datos, tipo: nodo.tipo, ...externo },
    select: { id: true },
  });
  return { id: nuevo.id, creado: true };
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

/** Aplica un plan entero: nodos (contando nuevos/actualizados) y después conexiones. */
export async function aplicarPlan(
  tx: Tx,
  origen: string,
  nodos: readonly NodoPlan[],
  conexiones: readonly ConexionPlan[],
): Promise<ConteoAplicado & { idPorExterno: ReadonlyMap<string, string> }> {
  const idPorExterno = new Map<string, string>();
  const conteoNodos = { nuevos: 0, actualizados: 0 };
  for (const nodo of nodos) {
    const { id, creado } = await guardarNodo(tx, origen, nodo);
    idPorExterno.set(nodo.externoId, id);
    if (creado) conteoNodos.nuevos += 1;
    else conteoNodos.actualizados += 1;
  }
  const conteoConexiones = { nuevas: 0, existentes: 0 };
  for (const conexion of conexiones) {
    const creada = await guardarConexion(tx, idPorExterno, conexion);
    if (creada) conteoConexiones.nuevas += 1;
    else conteoConexiones.existentes += 1;
  }
  return { nodos: conteoNodos, conexiones: conteoConexiones, idPorExterno };
}
