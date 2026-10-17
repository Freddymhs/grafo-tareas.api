import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { EtapasService } from '../../modules/nodos/etapas.service.js';
import { TodoistClient } from './todoist.client.js';
import { aplicarPlan, Tx } from '../aplicar-plan.js';
import { Plan, traducir } from './traducir.js';

export interface ResumenImportacion {
  readonly proyectoId: string;
  readonly seco: boolean;
  readonly tareasLeidas: number;
  readonly nodos: { readonly nuevos: number; readonly actualizados: number };
  readonly conexiones: { readonly nuevas: number; readonly existentes: number };
}

@Injectable()
export class ImportadorTodoistService {
  constructor(
    private readonly todoist: TodoistClient,
    private readonly prisma: PrismaService,
    private readonly etapas: EtapasService,
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
    const plan = traducir(tareas, secciones, this.etapas.lista());
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
    const { nodos, conexiones } = await aplicarPlan(
      tx,
      plan.origen,
      plan.nodos,
      plan.conexiones,
    );
    return { nodos, conexiones };
  }
}
