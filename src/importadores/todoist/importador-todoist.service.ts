import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { EtapasService } from '../../modules/nodos/etapas.service.js';
import { TodoistClient } from './todoist.client.js';
import { aplicarPlan, ConteoAplicado, Tx } from '../aplicar-plan.js';
import { simular } from '../simulacro.js';
import { Plan, traducir } from './traducir.js';

export interface ResumenImportacion {
  readonly proyectoId: string;
  readonly seco: boolean;
  readonly tareasLeidas: number;
  /** Con los descartados en el grafo (FASE 16) y las conexiones que no se crean por tocarlos. */
  readonly nodos: ConteoAplicado['nodos'];
  readonly conexiones: ConteoAplicado['conexiones'];
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
      return {
        ...base,
        ...(await simular(this.prisma, (tx) => this.aplicar(tx, plan))),
      };
    }
    const aplicado = await this.prisma.$transaction((tx) =>
      this.aplicar(tx, plan),
    );
    return { ...base, ...aplicado };
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
