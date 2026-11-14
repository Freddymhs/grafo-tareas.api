import { TIPO_NODO } from './tipos.constants.js';

/**
 * La FASE con su casilla «Mergeado» tildada (FASE 17): la llevan las FASE que ya la tenían, y no la pone nadie más
 * (FASE 25 D2). Lo mergeado de hoy es la columna `ETAPA_MERGEADA`. Depender de cualquiera de las dos ya está cumplido
 * aunque siga ABIERTA por sus trámites (`dependenciaCumplida`).
 */
export const ETIQUETA_MERGEADA = 'mergeada';

/** El parte del día (FASE 10) habla de tareas y de FASE: lo que se hace y lo que se entrega. */
export const TIPOS_DEL_DIA: readonly string[] = [
  TIPO_NODO.TAREA,
  TIPO_NODO.FASE,
];
/** Freddy lleva dos tarjetas a la vez a propósito (C11): el aviso es con más de dos, no con más de una. */
export const LIMITE_EN_CURSO = 2;
/** Sin `desde`, «terminé» mira las últimas 24 h: lo de desde la daily de ayer. */
export const HORAS_DEL_PARTE = 24;

export const PATRON_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;
export const LARGO_MAXIMO_TITULO = 500;
/** El resumen es una línea para leer en voz alta en una reunión: más que esto ya es una descripción. */
export const LARGO_MAXIMO_RESUMEN = 200;
export const MAXIMO_POSICIONES_POR_LOTE = 5000;

/**
 * Lo que falta después de cerrar (URL commit, evidencias, wiki): una columna a la derecha de CERRADO (Freddy, 2026-10-18:
 * «a la derecha… estas son las cosas que me faltaron después de haber cerrado»). Un trámite va acá sea cual sea su
 * sección en el tablero de origen: en ENTENDIMIENTO parecía trabajo por entender.
 */
export const ETAPA_TRAMITES = 'TRÁMITES DE CIERRE';
/**
 * La columna de lo mergeado: «mergeado: el PR entró a la base» (docs/roles.yaml, `aprobado`, en Producto y Calidad). El
 * hook `fase-tilde` lleva ahí la tarjeta `[<id>]` al tildar Mergeado, pero la etiqueta `mergeada` la lleva solo su FASE:
 * depender de una tarjeta en esta columna también está cumplido (`dependenciaCumplida`; real 21-10, 26998 → 25325).
 */
export const ETAPA_MERGEADA = 'APROBADO';

/** Las columnas del tablero, en orden: las etapas del método (`tablero.secciones` en refs.yaml, PORTAR.md) con los
 *  nombres que Freddy usa en su tablero. C9 (2026-10-16): lista fija. `ETAPAS` en el entorno la reemplaza (coma). */
export const ETAPAS_POR_DEFECTO: readonly string[] = [
  'ENTENDIMIENTO',
  'EN CODIGO',
  'Collection Created',
  '❓ DUDAS EN ESPERA',
  'AMARRAR 🧰',
  'CAMBIAR 🧰',
  'RED 🧰',
  'TESTEADO',
  'LISTO PARA PR',
  'Pull Request',
  ETAPA_MERGEADA,
  'CERRADO',
  ETAPA_TRAMITES,
  '🔎 Precheck fin de sprint (archivadas)',
];
export const PRIORIDAD_MINIMA = 1;
export const PRIORIDAD_MAXIMA = 4;
export const LARGO_MAXIMO_ETIQUETA = 50;
export const LARGO_MAXIMO_BUSQUEDA = 200;
/** Un listado no devuelve más que esto por página (el tablero pide 500 y le alcanza). */
export const LIMITE_MAXIMO_PAGINA = 500;

/** Un complemento (FASE 9) se reconoce por esta etiqueta: `complemento:<clave del catálogo de roles.yaml>`. */
export const PREFIJO_COMPLEMENTO = 'complemento:';
/** La clave del catálogo que deja `POST /nodos/:id/decidir`: una duda contestada (tiene que estar en roles.yaml). */
export const CLAVE_DECISION = 'decision';
/** La clave del catálogo para los trámites de cierre (FASE 10): «el día» muestra los que existen; no se crean nuevos. */
export const CLAVE_TRAMITE = 'tramite';
/** Un ritual (daily, retro, 1:1) es un DAILY_ITEM con este origen externo, creado la primera vez que se usa. */
export const ORIGEN_RITUAL = 'ritual';
/** `GET /nodos?notas=ocultar`: el valor único del filtro. */
export const OCULTAR_NOTAS = 'ocultar';
export const etiquetaDeComplemento = (clave: string) =>
  `${PREFIJO_COMPLEMENTO}${clave}`;
/**
 * El reparto de una HU (FASE 17): cada pieza del plan dice su ronda (1 cimiento, 2 paralelo, 3 cruce…) con una etiqueta
 * `ronda:<n>`, y cuelga de su carril (una zona de código), una RAMA con la etiqueta `carril`. El tablero del plan es una
 * columna por carril, en orden de ronda.
 */
export const PREFIJO_RONDA = 'ronda:';
export const etiquetaDeRonda = (ronda: string) => `${PREFIJO_RONDA}${ronda}`;
export const ETIQUETA_CARRIL = 'carril';
/** Una pieza del reparto (FASE 13 R4): la lleva en el plan y la conserva al tomarla, cuando pasa a lo real. */
export const ETIQUETA_PIEZA = 'pieza';

/** Largo máximo del nombre de un espacio, de un proyecto o de un tipo. */
export const LARGO_MAXIMO_NOMBRE = 100;
