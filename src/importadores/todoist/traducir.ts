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
import { externoHistoria, nodoHistoria, SIN_TABLERO } from '../plan.js';
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

/** D6: cómo se escribe cada persona en Todoist → un solo nodo PERSONA (C8: Tomás = Carabantes, a confirmar). */
export const ALIAS_PERSONAS: Readonly<Record<string, readonly string[]>> = {
  'Tomás Carabantes': [
    'Tomás Carabantes',
    'Tomas Carabantes',
    'Tomás',
    'Tomas',
    'Thomas',
    'Carabantes',
  ],
  Fabián: ['Fabián', 'Fabian'],
};

/**
 * R4 (FASE 13): una pieza de `/flow:pbi:repartir` se reconoce por la cabecera fija de su descripción —
 * `# N.M · título   HU <n> · task …`— y no por el título, que cambia al tomarla (`5️⃣ 🟢 [26309] …`).
 */
const CABECERA_PIEZA = /^#\s*\d+\.\d+[a-z]?\s+·.*?\bHU\s+(\d{5,6})\b/;
/** La ronda abre el título: 1️⃣ cimiento · 2️⃣ paralelo · 3️⃣ cruce (y las que el reparto agregue). */
const RONDA = /^([1-9])\uFE0F?\u20E3/u;
/** El último tramo del título dice si la task existe: «por crear», «descartada…» o el id. */
const ESTADO_PIEZA: ReadonlyArray<readonly [RegExp, string]> = [
  [/·\s*por crear\s*$/i, 'por-crear'],
  [/·\s*descartada[^·]*$/i, 'descartada'],
];
/** Una sección `A · zona` es un carril del reparto (zona de código: dos carriles no comparten archivos). */
const CARRIL = /^[A-Z] · .+$/;
export const ETIQUETA_PIEZA = 'pieza';
/** Un color por carril, por su letra: en la VR cada carril se ve como su rama. */
export const COLORES_CARRIL: readonly string[] = [
  '#0ea5e9',
  '#14b8a6',
  '#8b5cf6',
  '#f43f5e',
  '#84cc16',
];

const PATRON_BLOQUEO = /BLOQUEO|esperando a/i;
const PATRON_FASE = /\bFASE ?(\d+)\b/g;
const PRIORIDAD_TODOIST_MAXIMA = 4;

const clave = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

export const externoRama = (emoji: string) => `rama:${emoji}`;
export const externoCarril = (hu: string, carril: string) =>
  `carril:${hu}:${carril}`;
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

interface Pieza {
  readonly hu: string;
  readonly etiquetas: readonly string[];
}

function piezaDe(tarea: TareaTodoist): Pieza | null {
  const cabecera = (tarea.description ?? '').split('\n')[0].trim();
  const hu = cabecera.match(CABECERA_PIEZA)?.[1];
  if (!hu) return null;
  const ronda = tarea.content.match(RONDA)?.[1];
  const estado = ESTADO_PIEZA.find(([patron]) =>
    patron.test(tarea.content),
  )?.[1];
  return {
    hu,
    etiquetas: [
      ETIQUETA_PIEZA,
      ...(ronda ? [`ronda:${ronda}`] : []),
      ...(estado ? [estado] : []),
    ],
  };
}

const colorDeCarril = (carril: string) =>
  COLORES_CARRIL[
    (carril.charCodeAt(0) - 'A'.charCodeAt(0)) % COLORES_CARRIL.length
  ];

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
    const pieza = piezaDe(tarea);
    return {
      externoId: tarea.id,
      tipo: TipoNodo.TAREA,
      titulo: tarea.content,
      descripcion: descripcionDe(tarea, seccion, etapa),
      estado: estadoDe(tarea, seccion),
      color: null,
      etapa,
      etiquetas: [...tarea.labels, ...(pieza?.etiquetas ?? [])],
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
    const pieza = piezaDe(tarea);
    const seccion = tarea.section_id
      ? (nombreSeccion.get(tarea.section_id) ?? null)
      : null;
    const carril = pieza && seccion && CARRIL.test(seccion) ? seccion : null;
    if (pieza) sintetizar(nodoHistoria(pieza.hu, null, true));
    if (pieza && carril) {
      sintetizar({
        externoId: externoCarril(pieza.hu, carril),
        tipo: TipoNodo.RAMA,
        titulo: `${pieza.hu} · ${carril}`,
        ...SIN_TABLERO,
        color: colorDeCarril(carril),
      });
    }
    const deLaPieza: ConexionPlan[] = pieza
      ? [
          externoHistoria(pieza.hu),
          ...(carril ? [externoCarril(pieza.hu, carril)] : []),
        ].map((destino) => ({
          origenExternoId: tarea.id,
          destinoExternoId: destino,
          tipo: TipoConexion.PERTENECE_A,
        }))
      : [];
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
