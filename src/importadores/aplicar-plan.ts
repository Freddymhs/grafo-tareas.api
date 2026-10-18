import { Prisma, TipoCambio } from '@prisma/client';
import { ConexionPlan, NodoPlan } from './plan.js';

export type Tx = Prisma.TransactionClient;

export interface ConteoAplicado {
  readonly nodos: {
    readonly nuevos: number;
    readonly actualizados: number;
    /** Descartados al pulir el grafo (FASE 16): la fuente los sigue trayendo y no se reviven. */
    readonly descartados: number;
  };
  readonly conexiones: {
    readonly nuevas: number;
    readonly existentes: number;
    /** Las que tocan un nodo descartado: no se crean. */
    readonly omitidas: number;
  };
}

/** Lo que pasó con un nodo del plan: guardado (con su id), o descartado en el grafo y por eso no tocado. */
export type NodoGuardado =
  | {
      readonly descartado: false;
      readonly id: string;
      readonly creado: boolean;
      readonly cambio: boolean;
    }
  | { readonly descartado: true };

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
 * El grafo manda sobre lo que se pulió en él (FASE 16): un nodo descartado no se revive, y un campo editado en el grafo
 * (bitácora EDICION) conserva su valor aunque la fuente traiga otro.
 *
 * Idempotente por `externo` (C3, D8): la segunda corrida no duplica, y **solo escribe lo que cambió**. Escribir
 * todo en cada corrida dejaba `updatedAt` con la fecha de la importación en todos los nodos, y «qué terminé hoy»
 * (FASE 10) no se podía leer: las 59 cerradas tenían fecha de hoy.
 */
export async function guardarNodo(
  tx: Tx,
  externoOrigen: string,
  nodo: NodoPlan,
): Promise<NodoGuardado> {
  const externo = {
    externoOrigen: nodo.origen ?? externoOrigen,
    externoId: nodo.externoId,
  };
  const descartado = await tx.descarte.findUnique({
    where: { externoOrigen_externoId: externo },
    select: { id: true },
  });
  if (descartado) return { descartado: true };
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
  // La fecha de origen solo se escribe si la fuente la trae: sin ella, el nodo conserva la suya.
  const fechaOrigen = nodo.fechaOrigen ? new Date(nodo.fechaOrigen) : null;
  const conFecha = fechaOrigen ? { fechaOrigen } : {};
  const existente = await tx.nodo.findUnique({
    where: { externoOrigen_externoId: externo },
    select: { id: true, fechaOrigen: true, ...CAMPOS_DEL_PLAN },
  });
  if (existente) {
    const editados = new Set(
      (
        await tx.cambio.findMany({
          where: { nodoId: existente.id, tipo: TipoCambio.EDICION },
          select: { campo: true },
        })
      ).map(({ campo }) => campo),
    );
    const respetar = <K extends keyof DatosDelPlan>(
      campo: K,
    ): DatosDelPlan[K] =>
      editados.has(campo) ? existente[campo] : datos[campo];
    const finales: DatosDelPlan = {
      titulo: respetar('titulo'),
      descripcion: respetar('descripcion'),
      estado: respetar('estado'),
      color: respetar('color'),
      etapa: respetar('etapa'),
      etiquetas: respetar('etiquetas'),
      prioridad: respetar('prioridad'),
      vence: respetar('vence'),
    };
    const otraFecha =
      fechaOrigen !== null && !mismaFecha(existente.fechaOrigen, fechaOrigen);
    const cambio =
      !nodo.soloSiFalta && (!iguales(existente, finales) || otraFecha);
    if (cambio) {
      await tx.nodo.update({
        where: { id: existente.id },
        data: { ...finales, ...conFecha },
      });
    }
    return { descartado: false, id: existente.id, creado: false, cambio };
  }
  const nuevo = await tx.nodo.create({
    data: { ...datos, ...conFecha, tipo: nodo.tipo, ...externo },
    select: { id: true },
  });
  return { descartado: false, id: nuevo.id, creado: true, cambio: true };
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
  const descartados = new Set<string>();
  const conteoNodos = { nuevos: 0, actualizados: 0, descartados: 0 };
  for (const nodo of nodos) {
    const guardado = await guardarNodo(tx, origen, nodo);
    if (guardado.descartado) {
      descartados.add(nodo.externoId);
      conteoNodos.descartados += 1;
      continue;
    }
    idPorExterno.set(nodo.externoId, guardado.id);
    if (guardado.creado) conteoNodos.nuevos += 1;
    else if (guardado.cambio) conteoNodos.actualizados += 1;
  }
  const conteoConexiones = { nuevas: 0, existentes: 0, omitidas: 0 };
  for (const conexion of conexiones) {
    const tocaUnDescartado =
      descartados.has(conexion.origenExternoId) ||
      descartados.has(conexion.destinoExternoId);
    if (tocaUnDescartado) {
      conteoConexiones.omitidas += 1;
      continue;
    }
    const creada = await guardarConexion(tx, idPorExterno, conexion);
    if (creada) conteoConexiones.nuevas += 1;
    else conteoConexiones.existentes += 1;
  }
  return { nodos: conteoNodos, conexiones: conteoConexiones, idPorExterno };
}
