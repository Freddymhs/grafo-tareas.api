import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { EtapasService } from '../../modules/nodos/etapas.service.js';
import {
  CLAVE_TRAMITE,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import { leerRoles } from '../../modules/roles/leer-roles.js';
import type { Roles } from '../../modules/roles/roles.types.js';
import { aplicarPlan, conectar, guardarNodo, Tx } from '../aplicar-plan.js';
import { simular } from '../simulacro.js';
import { AbiertoLeido, leerAbiertos } from './leer-abiertos.js';
import { FaseLeida, leerFase } from './leer-fase.js';
import {
  DudaPlan,
  esPadres,
  externoFase,
  Padres,
  PlanFases,
  SIN_PADRES,
  traducirFases,
} from './traducir-fases.js';

/** Una FASE del backlog y la task del tracker que documenta: para colgar de ella las tarjetas que la citan. */
interface TaskDeFase {
  readonly externoId: string;
  readonly task: string;
}

export interface OpcionesFases {
  /** Carpeta con las FASE_*.md (`docs/backlog` del orquestador). */
  readonly backlog: string;
  /** Carpeta `Tareas/` con `<id>/entendimiento.md`; sin ella, las dudas ya importadas no se tocan. */
  readonly tareas: string | null;
  /** El `roles.yaml` del área: dice el rol de cada FASE y cómo se deriva su etapa. */
  readonly roles: string;
  /** El orquestador dueño de esas FASE: separa sus nodos de los de otro proyecto. */
  readonly proyecto: string;
  /**
   * Otro origen cuyas «FASE n» son de ESTE proyecto (p. ej. `todoist` para el Laboratorio: TRABAJO es el SAG): esos
   * nodos se adoptan —pasan a este origen, con su id y sus conexiones— en vez de duplicarse (C10, FASE 11).
   */
  readonly adoptar: string | null;
  /** JSON `{ tareas: { <task>: <hu> }, padres: { <hu>: <título> } }` leído del tracker (FASE 13); null = sin HU. */
  readonly padres: string | null;
  readonly seco: boolean;
}

export interface ResumenFases {
  readonly backlog: string;
  readonly proyecto: string;
  readonly seco: boolean;
  readonly fasesLeidas: number;
  readonly abiertosLeidos: number;
  readonly nodos: { readonly nuevos: number; readonly actualizados: number };
  readonly conexiones: { readonly nuevas: number; readonly existentes: number };
  /** Dudas de una corrida anterior que ya no están en §ABIERTO: se cierran. */
  readonly dudasCerradas: number;
  /** Dudas cuya task no tiene tarjeta `[<id>]` en el grafo: quedan sin conexión. */
  readonly dudasSueltas: number;
  /** «FASE n» de `adoptar` que pasaron a este proyecto. */
  readonly adoptadas: number;
  /** Tarjetas que citan la task de una FASE y quedaron colgando de ella en esta corrida (R3, FASE 13). */
  readonly tarjetasEnganchadas: number;
}

const ES_FASE = /^FASE_\d+_.*\.md$/;
const ENTENDIMIENTO = 'entendimiento.md';
const SIN_DUDAS = {
  nuevos: 0,
  actualizados: 0,
  conexionesNuevas: 0,
  conexionesExistentes: 0,
  sueltas: 0,
  cerradas: 0,
};

/** Los archivos del método son la fuente; el grafo los refleja. Solo lectura sobre ellos. */
@Injectable()
export class ImportadorFasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly etapas: EtapasService,
  ) {}

  async importar(opciones: OpcionesFases): Promise<ResumenFases> {
    const roles = this.leerRoles(opciones.roles);
    const fases = this.leerFases(opciones.backlog, roles);
    const conTramite = roles.complementos.some(
      ({ clave }) => clave === CLAVE_TRAMITE,
    );
    const abiertos = opciones.tareas
      ? this.leerEntendimientos(opciones.tareas)
      : [];
    const plan = traducirFases(
      fases,
      abiertos,
      this.etapas.lista(),
      opciones.proyecto,
      conTramite ? etiquetaDeComplemento(CLAVE_TRAMITE) : null,
      opciones.padres ? this.leerPadres(opciones.padres) : SIN_PADRES,
    );
    const tasks = fases.flatMap(({ numero, task }) =>
      task ? [{ externoId: externoFase(numero), task }] : [],
    );
    const base = {
      backlog: opciones.backlog,
      proyecto: opciones.proyecto,
      seco: opciones.seco,
      fasesLeidas: fases.length,
      abiertosLeidos: abiertos.length,
    };
    const conTareas = opciones.tareas !== null;
    const aplicar = (tx: Tx) =>
      this.aplicar(tx, plan, conTareas, opciones.adoptar, tasks);
    const aplicado = opciones.seco
      ? await simular(this.prisma, aplicar)
      : await this.prisma.$transaction(aplicar);
    return { ...base, ...aplicado };
  }

  private leerRoles(archivo: string): Roles {
    if (!existsSync(archivo)) {
      throw new Error(
        `no existe ${archivo}: cada área trae su roles.yaml (nuevo-workspace lo copia de la plantilla) o se pasa con --roles`,
      );
    }
    return leerRoles(readFileSync(archivo, 'utf8'));
  }

  /** El mapa de padres viene de afuera (lo arma bin/importar-en-produccion): se valida la forma antes de usarlo. */
  private leerPadres(archivo: string): Padres {
    if (!existsSync(archivo)) throw new Error(`no existe ${archivo}`);
    const leido: unknown = JSON.parse(readFileSync(archivo, 'utf8'));
    if (!esPadres(leido)) {
      throw new Error(
        `${archivo}: se esperaba { tareas: { <task>: <hu> }, padres: { <hu>: <título> } } con textos`,
      );
    }
    return leido;
  }

  private leerFases(backlog: string, roles: Roles): readonly FaseLeida[] {
    if (!existsSync(backlog))
      throw new Error(`no existe la carpeta ${backlog}`);
    return readdirSync(backlog)
      .filter((nombre) => ES_FASE.test(nombre))
      .sort()
      .map((nombre) =>
        leerFase(nombre, readFileSync(join(backlog, nombre), 'utf8'), roles),
      );
  }

  private leerEntendimientos(tareas: string): readonly AbiertoLeido[] {
    if (!existsSync(tareas)) throw new Error(`no existe la carpeta ${tareas}`);
    return readdirSync(tareas, { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .flatMap((carpeta) => {
        const ruta = join(tareas, carpeta.name, ENTENDIMIENTO);
        if (!existsSync(ruta)) return [];
        return leerAbiertos(carpeta.name, readFileSync(ruta, 'utf8'));
      });
  }

  private async aplicar(
    tx: Tx,
    plan: PlanFases,
    conTareas: boolean,
    adoptar: string | null,
    tasks: readonly TaskDeFase[],
  ) {
    // Nunca se adopta por título: «FASE 6» de Todoist puede ser de otro orquestador (real 2026-10-17, la FASE 6 del
    // SAG). Solo si el que importa dice de qué origen son sus FASE (`adoptar`), y siempre por externo.
    const adoptadas = adoptar
      ? await this.adoptar(tx, adoptar, plan.origen, plan.nodos)
      : 0;
    const fases = await aplicarPlan(
      tx,
      plan.origen,
      plan.nodos,
      plan.conexiones,
    );
    // Sin --tareas no se leyó ningún entendimiento: eso no prueba que las dudas se cerraron, así que no se tocan.
    const dudas = conTareas
      ? await this.aplicarDudas(tx, plan.origen, plan.dudas)
      : SIN_DUDAS;
    const tarjetasEnganchadas = await this.engancharTarjetas(
      tx,
      fases.idPorExterno,
      tasks,
    );
    return {
      nodos: {
        nuevos: fases.nodos.nuevos + dudas.nuevos,
        actualizados: fases.nodos.actualizados + dudas.actualizados,
      },
      conexiones: {
        nuevas: fases.conexiones.nuevas + dudas.conexionesNuevas,
        existentes: fases.conexiones.existentes + dudas.conexionesExistentes,
      },
      dudasCerradas: dudas.cerradas,
      dudasSueltas: dudas.sueltas,
      adoptadas,
      tarjetasEnganchadas,
    };
  }

  /**
   * R3 (FASE 13): la tarjeta de una task (`[25476] …`, o que la cita en el título) PERTENECE_A su FASE. No se
   * fusionan: la tarjeta es la proyección del tablero y la FASE el documento; D10 las marca a las dos a propósito.
   * Se busca el id como número entero (25476 no engancha 254761). Devuelve las conexiones nuevas.
   */
  private async engancharTarjetas(
    tx: Tx,
    idPorExterno: ReadonlyMap<string, string>,
    tasks: readonly TaskDeFase[],
  ): Promise<number> {
    const nuevas: boolean[] = [];
    for (const { externoId, task } of tasks) {
      const faseId = idPorExterno.get(externoId);
      if (!faseId) continue;
      const citaLaTask = new RegExp(`(^|\\D)${task}(\\D|$)`);
      const candidatas = await tx.nodo.findMany({
        where: { tipo: TipoNodo.TAREA, titulo: { contains: task } },
        select: { id: true, titulo: true },
      });
      for (const { id } of candidatas.filter(({ titulo }) =>
        citaLaTask.test(titulo),
      )) {
        nuevas.push(
          await conectar(tx, {
            origenId: id,
            destinoId: faseId,
            tipo: TipoConexion.PERTENECE_A,
          }),
        );
      }
    }
    return nuevas.filter(Boolean).length;
  }

  /**
   * Cada FASE del plan que existe en `desde` (mismo `fase:n`) pasa a `origen`. Si `origen` ya tiene la suya —porque
   * `desde` se reimportó después de una adopción y la volvió a crear—, la de `desde` se fusiona en la propia: sus
   * conexiones pasan y la copia se borra. Sin esto, reimportar Todoist dejaba ~15 «FASE n» duplicadas con las tareas
   * colgando de la copia (medido 2026-10-17, preparando el corte).
   */
  private async adoptar(
    tx: Tx,
    desde: string,
    origen: string,
    nodos: PlanFases['nodos'],
  ): Promise<number> {
    const deFases = nodos.filter(({ tipo }) => tipo === TipoNodo.FASE);
    // En serie: la transacción interactiva usa una sola conexión.
    const adoptados: number[] = [];
    for (const { externoId } of deFases) {
      const propio = await this.faseDe(tx, origen, externoId);
      const copia = await this.faseDe(tx, desde, externoId);
      if (copia && propio) {
        await this.fusionar(tx, copia.id, propio.id);
        adoptados.push(1);
      } else if (copia) {
        await tx.nodo.update({
          where: { id: copia.id },
          data: { externoOrigen: origen },
        });
        adoptados.push(1);
      }
    }
    return adoptados.reduce((total, n) => total + n, 0);
  }

  private faseDe(tx: Tx, externoOrigen: string, externoId: string) {
    return tx.nodo.findFirst({
      where: { externoOrigen, externoId, tipo: TipoNodo.FASE },
      select: { id: true },
    });
  }

  /** Las conexiones de `copia` pasan a `propia` (las que ya tiene no se duplican) y `copia` se borra. */
  private async fusionar(tx: Tx, copia: string, propia: string) {
    const conexiones = await tx.conexion.findMany({
      where: { OR: [{ origenId: copia }, { destinoId: copia }] },
    });
    for (const { origenId, destinoId, tipo } of conexiones) {
      const clave = {
        origenId: origenId === copia ? propia : origenId,
        destinoId: destinoId === copia ? propia : destinoId,
        tipo,
      };
      const esConsigoMisma = clave.origenId === clave.destinoId;
      if (!esConsigoMisma) await conectar(tx, clave);
    }
    // onDelete: Cascade se lleva las conexiones viejas de la copia.
    await tx.nodo.delete({ where: { id: copia } });
  }

  /** Cada punto ABIERTO frena a su task: TAREA `[<id>]…` BLOQUEADA_POR la DUDA. Lo que ya no está abierto se cierra. */
  private async aplicarDudas(
    tx: Tx,
    origen: string,
    dudas: readonly DudaPlan[],
  ) {
    const conteo = {
      nuevos: 0,
      actualizados: 0,
      conexionesNuevas: 0,
      conexionesExistentes: 0,
      sueltas: 0,
    };
    const vigentes: string[] = [];
    for (const duda of dudas) {
      const guardada = await guardarNodo(tx, origen, duda);
      vigentes.push(duda.externoId);
      // Descartada al pulir el grafo (FASE 16): no se revive ni se conecta.
      if (guardada.descartado) continue;
      const { id, creado, cambio } = guardada;
      if (creado) conteo.nuevos += 1;
      else if (cambio) conteo.actualizados += 1;
      const tarea = await tx.nodo.findFirst({
        where: {
          tipo: TipoNodo.TAREA,
          titulo: { startsWith: duda.tareaPrefijo },
        },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!tarea) {
        conteo.sueltas += 1;
        continue;
      }
      const nueva = await conectar(tx, {
        origenId: tarea.id,
        destinoId: id,
        tipo: TipoConexion.BLOQUEADA_POR,
      });
      if (nueva) conteo.conexionesNuevas += 1;
      else conteo.conexionesExistentes += 1;
    }
    const cerradas = await tx.nodo.updateMany({
      where: {
        externoOrigen: origen,
        externoId: { startsWith: 'abierto:' },
        estado: EstadoNodo.ABIERTO,
        NOT: { externoId: { in: vigentes } },
      },
      data: { estado: EstadoNodo.CERRADO },
    });
    return { ...conteo, cerradas: cerradas.count };
  }
}
