// Todoist → plan de nodos y conexiones. Función PURA: no toca red ni base; el test corre sobre un fixture real.
// Las reglas D1-D8 están en docs/backlog/FASE_3_IMPORTADOR_TODOIST.md y las decidió Freddy el 2026-10-16.
import { Cara, EstadoNodo, TipoConexion, TipoNodo } from '@prisma/client';

export interface TareaTodoist {
  readonly id: string;
  readonly content: string;
  readonly description: string | null;
  readonly section_id: string | null;
  readonly parent_id: string | null;
  readonly labels: readonly string[];
  readonly priority: number;
  readonly checked: boolean;
  readonly due: { readonly date: string } | null;
  /** Cuándo se creó la tarjeta (la API de Todoist la trae siempre; los fixtures viejos, no). */
  readonly added_at?: string | null;
}

export interface SeccionTodoist {
  readonly id: string;
  readonly name: string;
}

export type { ConexionPlan, NodoPlan, Plan } from '../plan.js';
import { ETAPA_TRAMITES } from '../../common/constants/grafo.constants.js';
import { alrededorDePieza, esCarril, piezaDe } from '../pieza.js';
import { SIN_TABLERO } from '../plan.js';
import type { ConexionPlan, NodoPlan, Plan } from '../plan.js';

export const ORIGEN_TODOIST = 'todoist';

/** D2: en estas secciones la tarea ya terminó aunque Todoist no la tenga completada. */
export const SECCIONES_CERRADAS: readonly string[] = [
  'CERRADO',
  '🔎 Precheck fin de sprint (archivadas)',
];

/** D4: los círculos de Freddy y su color en el grafo. */
export const COLOR_POR_EMOJI: Readonly<Record<string, string>> = {
  '🔵': '#3b82f6',
  '🟢': '#22c55e',
  '🟠': '#f97316',
  '🟣': '#a855f7',
  '🟡': '#eab308',
  '🔴': '#ef4444',
};

/**
 * D6: cómo se escribe cada persona en Todoist → un solo nodo PERSONA (C8: «Tomás» a secas = Carabantes, a confirmar).
 * «Thomas» es Tomás Soto, el senior de backend (Freddy, 2026-10-18). Va primero: se toma la primera persona con un
 * alias en el texto, y «Tomás Soto» contiene «Tomás».
 */
export const ALIAS_PERSONAS: Readonly<Record<string, readonly string[]>> = {
  'Tomás Soto': ['Tomás Soto', 'Tomas Soto', 'Thomas', 'Soto'],
  'Tomás Carabantes': [
    'Tomás Carabantes',
    'Tomas Carabantes',
    'Tomás',
    'Tomas',
    'Carabantes',
  ],
  Fabián: ['Fabián', 'Fabian'],
};

const PATRON_BLOQUEO = /BLOQUEO|esperando a/i;
const PATRON_FASE = /\bFASE ?(\d+)\b/g;
/**
 * FASE 15 tarea 3 (Freddy, 2026-10-18: «más un estorbo y carga cognitiva que datos valiosos»): una tarjeta que habla
 * del cierre oficial de una task —URL commit, Evidencias, la wiki— es un trámite, y la VR puede apagarlos. Medido en
 * producción: 12 de 144 títulos, ninguno falso; «wiki» sola no, porque las retros del 01-oct la nombran.
 */
const PATRON_TRAMITE =
  /\bURL commit\b|\bEvidencias\b|\b(?:editar|actualizar) la wiki\b/i;
const PRIORIDAD_TODOIST_MAXIMA = 4;

const clave = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

export const externoRama = (emoji: string) => `rama:${emoji}`;
export const externoFase = (numero: string) => `fase:${numero}`;
export const externoPersona = (nombre: string) => `persona:${clave(nombre)}`;

function estadoDe(tarea: TareaTodoist, seccion: string | null): EstadoNodo {
  const seccionCerrada =
    seccion !== null && SECCIONES_CERRADAS.includes(seccion);
  return tarea.checked || seccionCerrada
    ? EstadoNodo.CERRADO
    : EstadoNodo.ABIERTO;
}

/** D1 (ampliada por C9): etapa, etiquetas, prioridad y fecha van a su campo. La sección que no es una etapa
 *  conocida se escribe al pie de la descripción para no perderla. */
function descripcionDe(
  tarea: TareaTodoist,
  seccion: string | null,
  etapa: string | null,
): string | null {
  const seccionPerdida =
    seccion !== null && etapa === null ? `[Todoist] sección: ${seccion}` : null;
  const partes = [tarea.description, seccionPerdida].filter(
    (parte): parte is string => !!parte,
  );
  return partes.length > 0 ? partes.join('\n\n') : null;
}

function prioridadDe(tarea: TareaTodoist): number {
  return PRIORIDAD_TODOIST_MAXIMA + 1 - tarea.priority;
}

function emojisDe(content: string): string[] {
  return Object.keys(COLOR_POR_EMOJI).filter((emoji) =>
    content.includes(emoji),
  );
}

function fasesDe(texto: string): string[] {
  return [
    ...new Set([...texto.matchAll(PATRON_FASE)].map(([, numero]) => numero)),
  ];
}

const piezaDeTarea = (tarea: TareaTodoist) =>
  piezaDe(tarea.content, tarea.description);

function personaBloqueante(content: string): string | null {
  if (!PATRON_BLOQUEO.test(content)) return null;
  const candidata = Object.entries(ALIAS_PERSONAS).find(([, alias]) =>
    alias.some((a) => content.includes(a)),
  );
  return candidata ? candidata[0] : null;
}

export function traducir(
  tareas: readonly TareaTodoist[],
  secciones: readonly SeccionTodoist[],
  etapas: readonly string[],
  /** La cara del proyecto (FASE 17): «🚀 Draft trabajo» es el plan; lo demás, lo real. Solo la llevan sus tareas. */
  cara: Cara = Cara.REAL,
  /** La etiqueta del complemento trámite; null si el catálogo del área no lo tiene (ninguna tarjeta se marca). */
  etiquetaTramite: string | null = null,
  /**
   * El origen de las FASE del orquestador (`fases-md:<proyecto>`): «FASE 22» en un título cuelga de ESA FASE, por su
   * externo, y solo se crea si falta. Sin él, el tablero sintetiza su propia «FASE 22» y queda duplicada (C10).
   */
  origenFases: string | null = null,
): Plan {
  const nombreSeccion = new Map(secciones.map(({ id, name }) => [id, name]));
  const idsTareas = new Set(tareas.map(({ id }) => id));
  const sintetizados = new Map<string, NodoPlan>();
  const sintetizar = (nodo: NodoPlan) => sintetizados.set(nodo.externoId, nodo);

  const nodosTareas: NodoPlan[] = tareas.map((tarea) => {
    const seccion = tarea.section_id
      ? (nombreSeccion.get(tarea.section_id) ?? null)
      : null;
    // C9: la sección es la etapa del tablero si está en la lista; si no, queda al pie de la descripción.
    const etapa = seccion !== null && etapas.includes(seccion) ? seccion : null;
    const pieza = piezaDeTarea(tarea);
    const esTramite =
      etiquetaTramite !== null && PATRON_TRAMITE.test(tarea.content);
    const tramite = esTramite && etiquetaTramite ? [etiquetaTramite] : [];
    return {
      externoId: tarea.id,
      tipo: TipoNodo.TAREA,
      titulo: tarea.content,
      descripcion: descripcionDe(tarea, seccion, etapa),
      estado: estadoDe(tarea, seccion),
      color: null,
      // Lo que falta después de cerrar va a su columna, no a la sección donde quedó en el tablero de origen.
      etapa: esTramite ? ETAPA_TRAMITES : etapa,
      etiquetas: [...tarea.labels, ...(pieza?.etiquetas ?? []), ...tramite],
      prioridad: prioridadDe(tarea),
      vence: tarea.due?.date ?? null,
      fechaOrigen: tarea.added_at ?? null,
      cara,
    };
  });

  const conexiones = tareas.flatMap((tarea): ConexionPlan[] => {
    const ramas = emojisDe(tarea.content).map((emoji) => {
      sintetizar({
        externoId: externoRama(emoji),
        tipo: TipoNodo.RAMA,
        titulo: emoji,
        ...SIN_TABLERO,
        color: COLOR_POR_EMOJI[emoji] ?? null,
      });
      return {
        origenExternoId: tarea.id,
        destinoExternoId: externoRama(emoji),
        tipo: TipoConexion.PERTENECE_A,
      };
    });
    const fases = fasesDe(tarea.content).map((numero) => {
      sintetizar({
        externoId: externoFase(numero),
        tipo: TipoNodo.FASE,
        titulo: `FASE ${numero}`,
        ...SIN_TABLERO,
        color: null,
        ...(origenFases ? { origen: origenFases, soloSiFalta: true } : {}),
      });
      return {
        origenExternoId: tarea.id,
        destinoExternoId: externoFase(numero),
        tipo: TipoConexion.PERTENECE_A,
      };
    });
    const persona = personaBloqueante(tarea.content);
    if (persona) {
      sintetizar({
        externoId: externoPersona(persona),
        tipo: TipoNodo.PERSONA,
        titulo: persona,
        ...SIN_TABLERO,
        color: null,
      });
    }
    const esperas: ConexionPlan[] = persona
      ? [
          {
            origenExternoId: tarea.id,
            destinoExternoId: externoPersona(persona),
            tipo: TipoConexion.ESPERA_RESPUESTA_DE,
          },
        ]
      : [];
    // R4: la pieza PERTENECE_A su HU (la compartida; el tablero solo conoce el número: no pisa el título) y a
    // su carril si la sección es uno (`A · zona`); ya tomada y movida a una etapa, sigue colgando de su HU.
    const pieza = piezaDeTarea(tarea);
    const seccion = tarea.section_id
      ? (nombreSeccion.get(tarea.section_id) ?? null)
      : null;
    const carril = pieza && seccion && esCarril(seccion) ? seccion : null;
    const alrededor = pieza ? alrededorDePieza(tarea.id, pieza, carril) : null;
    alrededor?.nodos.forEach(sintetizar);
    const deLaPieza: ConexionPlan[] = alrededor?.conexiones ?? [];
    // D3: el padre depende de cada hija. Una hija cuyo padre no vino en el export queda suelta.
    const padre = tarea.parent_id;
    const dependenciaDelPadre: ConexionPlan[] =
      padre !== null && idsTareas.has(padre)
        ? [
            {
              origenExternoId: padre,
              destinoExternoId: tarea.id,
              tipo: TipoConexion.DEPENDE_DE,
            },
          ]
        : [];
    return [
      ...deLaPieza,
      ...ramas,
      ...fases,
      ...esperas,
      ...dependenciaDelPadre,
    ];
  });

  return {
    origen: ORIGEN_TODOIST,
    nodos: [...nodosTareas, ...sintetizados.values()],
    conexiones,
  };
}
