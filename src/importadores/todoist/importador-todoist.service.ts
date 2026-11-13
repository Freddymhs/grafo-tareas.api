import { Injectable } from '@nestjs/common';
import { Cara } from '@prisma/client';
import {
  CLAVE_TRAMITE,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AreaService } from '../../modules/area/area.service.js';
import { EtapasService } from '../../modules/nodos/etapas.service.js';
import { RolesService } from '../../modules/roles/roles.service.js';
import { TodoistClient } from './todoist.client.js';
import { aplicarPlan, ConteoAplicado, Tx } from '../aplicar-plan.js';
import { simular } from '../simulacro.js';
import { Plan, traducir } from './traducir.js';

export interface ResumenImportacion {
  readonly proyectoId: string;
  readonly seco: boolean;
  /** La cara que tomaron sus tareas (FASE 17). */
  readonly cara: Cara;
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
    private readonly roles: RolesService,
    private readonly area: AreaService,
  ) {}

  /** Lee Todoist (nunca escribe allá), traduce, y aplica el plan en UNA transacción: queda entero o no queda. */
  async importar(
    proyectoId: string,
    seco: boolean,
    cara: Cara,
    /** El origen de las FASE del orquestador (`origenFases(proyecto)`); null = el tablero sintetiza las suyas. */
    origenFases: string | null,
    /** El proyecto del grafo donde caen los nodos nuevos (`--proyecto-grafo`). */
    proyectoGrafoId: string,
  ): Promise<ResumenImportacion> {
    const [tareas, secciones] = await Promise.all([
      this.todoist.tareas(proyectoId),
      this.todoist.secciones(proyectoId),
    ]);
    // Las tarjetas de cierre oficial se marcan como trámite solo si el catálogo del área tiene ese complemento.
    const etiquetaTramite = etiquetaDeComplemento(CLAVE_TRAMITE);
    const conTramite = this.roles
      .etiquetasDeComplementos()
      .includes(etiquetaTramite);
    const plan = traducir(
      tareas,
      secciones,
      this.etapas.lista(),
      cara,
      conTramite ? etiquetaTramite : null,
      origenFases,
      this.area.personas(),
    );
    const base = { proyectoId, seco, cara, tareasLeidas: tareas.length };
    if (seco) {
      return {
        ...base,
        ...(await simular(this.prisma, (tx) =>
          this.aplicar(tx, plan, proyectoGrafoId),
        )),
      };
    }
    const aplicado = await this.prisma.$transaction((tx) =>
      this.aplicar(tx, plan, proyectoGrafoId),
    );
    return { ...base, ...aplicado };
  }

  private async aplicar(tx: Tx, plan: Plan, proyectoGrafoId: string) {
    const { nodos, conexiones } = await aplicarPlan(
      tx,
      plan.origen,
      plan.nodos,
      plan.conexiones,
      proyectoGrafoId,
    );
    return { nodos, conexiones };
  }
}
