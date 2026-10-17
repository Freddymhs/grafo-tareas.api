// FASE_*.md + entendimiento.md → plan del grafo (puro). Cada FASE es un nodo FASE con su etapa derivada de
// las casillas y la etiqueta de su rol (C11); `**Dependencias**` son conexiones DEPENDE_DE entre FASEs; cada punto ABIERTO es una DUDA.
import { EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';
import { externoHistoria, nodoHistoria } from '../plan.js';
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

/**
 * La task de cada FASE → su HU, y el título de cada HU: lo LEE el tracker (`bin/importar-en-produccion`), no la
 * prosa de la cabecera — medido 2026-10-17: solo 21 de 35 FASE nombran su HU, y con cinco redacciones distintas.
 */
export interface Padres {
  readonly tareas: Readonly<Record<string, string>>;
  readonly padres: Readonly<Record<string, string>>;
}
export const SIN_PADRES: Padres = { tareas: {}, padres: {} };

const esMapaDeTextos = (valor: unknown): valor is Record<string, string> =>
  typeof valor === 'object' &&
  valor !== null &&
  !Array.isArray(valor) &&
  Object.values(valor).every((v) => typeof v === 'string');

export const esPadres = (valor: unknown): valor is Padres =>
  typeof valor === 'object' &&
  valor !== null &&
  esMapaDeTextos((valor as Record<string, unknown>)['tareas']) &&
  esMapaDeTextos((valor as Record<string, unknown>)['padres']);

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
  // La primera línea es el avance: la tarjeta de la PWA la muestra como fases.html (FASE 11).
  const descripcion = [
    fase.avance,
    encabezado,
    fase.destraba ? `Destraba: ${fase.destraba}` : null,
  ]
    .filter((linea) => linea !== null && linea !== '')
    .join('\n');
  // «FASE 23 · Sonar Errores Microservicios · 26307»: nombre y task como fases.html, no «FASE 23» sola.
  const titulo = [tituloFase(fase.numero), fase.nombre, fase.task]
    .filter((parte) => parte !== null && parte !== '')
    .join(' · ');
  return {
    externoId: externoFase(fase.numero),
    tipo: TipoNodo.FASE,
    titulo,
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
  padres: Padres = SIN_PADRES,
): PlanFases {
  const numeros = new Set(fases.map(({ numero }) => numero));
  const tramites = fases.flatMap((fase) => {
    const tramite = etiquetaTramite ? tramiteDe(fase, etiquetaTramite) : null;
    return tramite ? [{ fase: fase.numero, tramite }] : [];
  });
  // R1-R2 (FASE 13): la FASE PERTENECE_A la HU padre de su task; una HU por padre aunque la citen varias FASE.
  const deHu = fases.flatMap((fase) => {
    const hu = fase.task ? padres.tareas[fase.task] : undefined;
    return hu ? [{ fase: fase.numero, hu }] : [];
  });
  const historias = [...new Set(deHu.map(({ hu }) => hu))].map((hu) =>
    nodoHistoria(hu, padres.padres[hu] ?? null, false),
  );
  const nodos = [
    ...fases.map((fase) => nodoDeFase(fase, etapas)),
    ...tramites.map(({ tramite }) => tramite),
    ...historias,
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
  const aSuHu: ConexionPlan[] = deHu.map(({ fase, hu }) => ({
    origenExternoId: externoFase(fase),
    destinoExternoId: externoHistoria(hu),
    tipo: TipoConexion.PERTENECE_A,
  }));
  return {
    origen: origenFases(proyecto),
    nodos,
    conexiones: [...conexiones, ...deTramites, ...aSuHu],
    dudas: abiertos.map(nodoDeAbierto),
  };
}
