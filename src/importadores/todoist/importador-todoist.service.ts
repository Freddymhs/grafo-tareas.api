import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { TodoistClient } from './todoist.client.js';
import { ConexionPlan, NodoPlan, Plan, traducir } from './traducir.js';

export interface ResumenImportacion {
  readonly proyectoId: string;
  readonly seco: boolean;
  readonly tareasLeidas: number;
  readonly nodos: { readonly nuevos: number; readonly actualizados: number };
  readonly conexiones: { readonly nuevas: number; readonly existentes: number };
}

type Tx = Prisma.TransactionClient;

@Injectable()
export class ImportadorTodoistService {
  constructor(
    private readonly todoist: TodoistClient,
    private readonly prisma: PrismaService,
  ) {}

  /** Lee Todoist (nunca escribe allá), traduce, y aplica el plan en UNA transacción: queda entero o no queda. */
  async importar(
    proyectoId: string,
    seco: boolean,
  ): Promise<ResumenImportacion> {
    const [tareas, secciones] = await Promise.all([
      this.todoist.tareas(proyectoId),
      this.todoist.secciones(proyectoId),
    ]);
    const plan = traducir(tareas, secciones);
    const base = { proyectoId, seco, tareasLeidas: tareas.length };
    if (seco) {
      return { ...base, ...this.contarSinEscribir(plan) };
    }
    const aplicado = await this.prisma.$transaction((tx) =>
      this.aplicar(tx, plan),
    );
    return { ...base, ...aplicado };
  }

  private contarSinEscribir(plan: Plan) {
    return {
      nodos: { nuevos: plan.nodos.length, actualizados: 0 },
      conexiones: { nuevas: plan.conexiones.length, existentes: 0 },
    };
  }

  private async aplicar(tx: Tx, plan: Plan) {
    const idPorExterno = new Map<string, string>();
    const nodos = { nuevos: 0, actualizados: 0 };
    for (const nodo of plan.nodos) {
      const { id, creado } = await this.guardarNodo(tx, plan.origen, nodo);
      idPorExterno.set(nodo.externoId, id);
      if (creado) nodos.nuevos += 1;
      else nodos.actualizados += 1;
    }
    const conexiones = { nuevas: 0, existentes: 0 };
    for (const conexion of plan.conexiones) {
      const creada = await this.guardarConexion(tx, idPorExterno, conexion);
      if (creada) conexiones.nuevas += 1;
      else conexiones.existentes += 1;
    }
    return { nodos, conexiones };
  }

  /** Idempotente por `externo` (C3, D8): la segunda corrida actualiza, no duplica. */
  private async guardarNodo(tx: Tx, externoOrigen: string, nodo: NodoPlan) {
    const externo = { externoOrigen, externoId: nodo.externoId };
    const existente = await tx.nodo.findUnique({
      where: { externoOrigen_externoId: externo },
      select: { id: true },
    });
    const datos = {
      titulo: nodo.titulo,
      descripcion: nodo.descripcion,
      estado: nodo.estado,
      color: nodo.color,
    };
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

  private async guardarConexion(
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
    const clave = { origenId, destinoId, tipo: conexion.tipo };
    const existente = await tx.conexion.findUnique({
      where: { origenId_destinoId_tipo: clave },
      select: { id: true },
    });
    if (existente) return false;
    await tx.conexion.create({ data: clave });
    return true;
  }
}
