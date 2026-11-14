import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
// La pieza del reparto (FASE 13 R4, FASE 17): qué es una pieza y qué trae al grafo (su HU y su carril). Entra por
// `POST /piezas` (el adaptador).
import {
  ETIQUETA_CARRIL,
  ETIQUETA_PIEZA,
  etiquetaDeRonda,
} from '../../common/constants/grafo.constants.js';
import { nodoHistoria, SIN_TABLERO } from './plan.js';
import type { ConexionPlan, NodoPlan } from './plan.js';

/**
 * Una pieza de `/flow:pbi:repartir` se reconoce por la cabecera fija de su descripción —
 * `# N.M · título   HU <n> · task …`— y no por el título, que cambia al tomarla (`5️⃣ 🟢 [26309] …`).
 */
const CABECERA_PIEZA = /^#\s*\d+\.\d+[a-z]?\s+·.*?\bHU\s+(\d{5,6})\b/;
/** La ronda abre el título: 1️⃣ cimiento · 2️⃣ paralelo · 3️⃣ cruce (y las que el reparto agregue). */
const RONDA = /^([1-9])️?⃣/u;
/** El último tramo del título dice si la task existe: «por crear», «descartada…» o el id. */
const ESTADO_PIEZA: ReadonlyArray<readonly [RegExp, string]> = [
  [/·\s*por crear\s*$/i, 'por-crear'],
  [/·\s*descartada[^·]*$/i, 'descartada'],
];
/** Un carril del reparto se llama `A · zona` (zona de código: dos carriles no comparten archivos). */
const CARRIL = /^[A-Z] · .+$/;
/**
 * Un color por carril, por su letra: en la VR cada carril se ve como su rama. Sin morados: en la VR el morado es el PBI,
 * y la C violeta hacía pasar por PBI a sus piezas (Freddy en el visor, 2026-10-18: «¿qué significa el morado?»).
 */
export const COLORES_CARRIL: readonly string[] = [
  '#0ea5e9',
  '#14b8a6',
  '#eab308',
  '#f43f5e',
  '#84cc16',
];

export const externoCarril = (hu: string, carril: string) =>
  `carril:${hu}:${carril}`;
export const esCarril = (nombre: string) => CARRIL.test(nombre);

export interface Pieza {
  readonly hu: string;
  readonly etiquetas: readonly string[];
}

export function piezaDe(
  titulo: string,
  descripcion: string | null,
): Pieza | null {
  const cabecera = (descripcion ?? '').split('\n')[0].trim();
  const hu = cabecera.match(CABECERA_PIEZA)?.[1];
  if (!hu) return null;
  const ronda = titulo.match(RONDA)?.[1];
  const estado = ESTADO_PIEZA.find(([patron]) => patron.test(titulo))?.[1];
  return {
    hu,
    etiquetas: [
      ETIQUETA_PIEZA,
      ...(ronda ? [etiquetaDeRonda(ronda)] : []),
      ...(estado ? [estado] : []),
    ],
  };
}

const colorDeCarril = (carril: string) =>
  COLORES_CARRIL[
    (carril.charCodeAt(0) - 'A'.charCodeAt(0)) % COLORES_CARRIL.length
  ];

/**
 * Lo que una pieza agrega además de sí misma: su HU (la compartida, solo si falta) y, si está en un carril, la RAMA
 * «HU · carril» con la etiqueta `carril` (la columna del plan); y la pieza PERTENECE_A las dos.
 */
export function alrededorDePieza(
  externoId: string,
  pieza: Pieza,
  carril: string | null,
): { readonly nodos: NodoPlan[]; readonly conexiones: ConexionPlan[] } {
  const nodoCarril: NodoPlan | null = carril
    ? {
        externoId: externoCarril(pieza.hu, carril),
        tipo: TIPO_NODO.RAMA,
        titulo: `${pieza.hu} · ${carril}`,
        ...SIN_TABLERO,
        // La API arma el tablero del plan con una columna por carril: lo reconoce por esta etiqueta, no por su id.
        etiquetas: [ETIQUETA_CARRIL],
        color: colorDeCarril(carril),
      }
    : null;
  const nodos = [
    nodoHistoria(pieza.hu, null, true),
    ...(nodoCarril ? [nodoCarril] : []),
  ];
  const conexiones = nodos.map(({ externoId: destino }) => ({
    origenExternoId: externoId,
    destinoExternoId: destino,
    tipo: TIPO_CONEXION.PERTENECE_A,
  }));
  return { nodos, conexiones };
}
