// FASE_*.md + entendimiento.md → plan del grafo (puro). Cada FASE es un nodo FASE con su etapa derivada de
// las casillas y la etiqueta de su rol (C11); `**Dependencias**` son conexiones DEPENDE_DE entre FASEs; cada punto ABIERTO es una DUDA.
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import type { ConexionPlan, NodoPlan, Plan } from '../plan.js';
import { AbiertoLeido } from './leer-abiertos.js';
import { FaseLeida } from './leer-fase.js';

export const ORIGEN_FASES = 'fases-md';
/**
 * El origen lleva el proyecto: `fase:3` del Laboratorio y `fase:3` de grafo-tareas son nodos distintos. Sin él,
 * importar el backlog de otro orquestador reescribía las FASE de éste (mismo `externo`).
 */
export const origenFases = (proyecto: string) => `${ORIGEN_FASES}:${proyecto}`;
export const ETIQUETA_ABIERTO = 'abierto';
export const externoFase = (numero: number) => `fase:${numero}`;
/** El trámite de cierre de una FASE (FASE 10): uno por FASE, se cierra solo cuando se tildan sus casillas. */
export const externoTramite = (numero: number) => `tramite:fase:${numero}`;
export const externoAbierto = (taskId: string, orden: number) =>
  `abierto:${taskId}:${orden}`;
/** El título que el importador de Todoist también usa para una FASE: así los dos apuntan al mismo nodo. */
export const tituloFase = (numero: number) => `FASE ${numero}`;
/** La tarjeta de una task en el tablero empieza así (contrato `tablero.tarjeta`). */
export const prefijoTarea = (taskId: string) => `[${taskId}]`;

export interface DudaPlan extends NodoPlan {
  /** Prefijo del título de la TAREA que esta duda frena; se resuelve al aplicar. */
  readonly tareaPrefijo: string;
}

export interface PlanFases extends Plan {
  readonly dudas: readonly DudaPlan[];
}

function etapaConocida(
  { numero, etapa }: FaseLeida,
  etapas: readonly string[],
) {
  if (!etapas.includes(etapa)) {
    throw new Error(
      `FASE ${numero}: la etapa «${etapa}» no está en GET /etapas: el roles.yaml del área y el de la API (ROLES_ARCHIVO) no coinciden`,
    );
  }
  return etapa;
}

function nodoDeFase(fase: FaseLeida, etapas: readonly string[]): NodoPlan {
  const encabezado = fase.titulo
    ? `${tituloFase(fase.numero)}: ${fase.titulo}`
    : null;
  const descripcion = [
    encabezado,
    fase.destraba ? `Destraba: ${fase.destraba}` : null,
  ]
    .filter((linea) => linea !== null)
    .join('\n');
  return {
    externoId: externoFase(fase.numero),
    tipo: TipoNodo.FASE,
    titulo: tituloFase(fase.numero),
    descripcion: descripcion || null,
    estado: fase.terminada ? EstadoNodo.CERRADO : EstadoNodo.ABIERTO,
    color: null,
    etapa: etapaConocida(fase, etapas),
    etiquetas: [fase.rol],
    prioridad: null,
    vence: null,
  };
}

/**
 * Una FASE entregada con casillas reales del cierre sin tildar deja un trámite «FASE n: falta …» (C11: esas
 * subtareas no se crean a mano). Con todo tildado el mismo nodo queda CERRADO; sin entregar, no hay trámite.
 */
function tramiteDe(fase: FaseLeida, etiqueta: string): NodoPlan | null {
  const pendiente = fase.cierrePendiente;
  if (pendiente === null) return null;
  const falta = pendiente.length > 0;
  return {
    externoId: externoTramite(fase.numero),
    tipo: TipoNodo.TAREA,
    titulo: falta
      ? `${tituloFase(fase.numero)}: falta ${pendiente.join(', ')}`
      : `${tituloFase(fase.numero)}: cierre oficial completo`,
    descripcion:
      'Sale de las casillas de «## Cierre oficial» de la FASE: se tilda allá, no acá.',
    estado: falta ? EstadoNodo.ABIERTO : EstadoNodo.CERRADO,
    color: null,
    etapa: null,
    etiquetas: [etiqueta],
    prioridad: null,
    vence: null,
  };
}

function nodoDeAbierto(abierto: AbiertoLeido): DudaPlan {
  return {
    externoId: externoAbierto(abierto.taskId, abierto.orden),
    tipo: TipoNodo.DUDA,
    titulo: abierto.titulo,
    descripcion: abierto.texto,
    estado: EstadoNodo.ABIERTO,
    color: null,
    etapa: null,
    etiquetas: [ETIQUETA_ABIERTO],
    prioridad: null,
    vence: null,
    tareaPrefijo: prefijoTarea(abierto.taskId),
  };
}

export function traducirFases(
  fases: readonly FaseLeida[],
  abiertos: readonly AbiertoLeido[],
  etapas: readonly string[],
  proyecto: string,
  /** La etiqueta del complemento trámite; null si el catálogo del área no lo tiene (no se crean trámites). */
  etiquetaTramite: string | null = null,
): PlanFases {
  const numeros = new Set(fases.map(({ numero }) => numero));
  const tramites = fases.flatMap((fase) => {
    const tramite = etiquetaTramite ? tramiteDe(fase, etiquetaTramite) : null;
    return tramite ? [{ fase: fase.numero, tramite }] : [];
  });
  const nodos = [
    ...fases.map((fase) => nodoDeFase(fase, etapas)),
    ...tramites.map(({ tramite }) => tramite),
  ];
  // Una dependencia a una FASE que no está en el directorio queda suelta: el plan solo conecta lo que trae.
  const conexiones: ConexionPlan[] = fases.flatMap((fase) =>
    fase.dependencias
      .filter((numero) => numeros.has(numero))
      .map((numero) => ({
        origenExternoId: externoFase(fase.numero),
        destinoExternoId: externoFase(numero),
        tipo: TipoConexion.DEPENDE_DE,
      })),
  );
  const deTramites: ConexionPlan[] = tramites.map(({ fase, tramite }) => ({
    origenExternoId: tramite.externoId,
    destinoExternoId: externoFase(fase),
    tipo: TipoConexion.PERTENECE_A,
  }));
  return {
    origen: origenFases(proyecto),
    nodos,
    conexiones: [...conexiones, ...deTramites],
    dudas: abiertos.map(nodoDeAbierto),
  };
}
