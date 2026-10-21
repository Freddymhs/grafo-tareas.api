import { TipoConexion, TipoNodo } from '@prisma/client';

/** Conexiones que bloquean a su origen mientras el destino siga ABIERTO (docs/_CONCEPTO.md § Modelo de dominio). */
export const CONEXIONES_BLOQUEANTES: readonly TipoConexion[] = [
  TipoConexion.DEPENDE_DE,
  TipoConexion.ESPERA_RESPUESTA_DE,
  TipoConexion.BLOQUEADA_POR,
];

/** "hoy puedo…" lista TAREAS (concepto § Modelo de dominio: tareas ABIERTAS no bloqueadas). FASE, RAMA, PERSONA, DUDA y PR
 *  agrupan o bloquean, no se hacen. Medido 2026-10-16 con datos reales: con FASE adentro salían 96 de 80 tareas abiertas. */
export const TIPOS_ACCIONABLES: readonly TipoNodo[] = [TipoNodo.TAREA];

/** El parte del día (FASE 10) habla de tareas y de FASE: lo que se hace y lo que se entrega. */
export const TIPOS_DEL_DIA: readonly TipoNodo[] = [
  TipoNodo.TAREA,
  TipoNodo.FASE,
];
/** Freddy lleva dos tarjetas a la vez a propósito (C11): el aviso es con más de dos, no con más de una. */
export const LIMITE_EN_CURSO = 2;
/** Sin `desde`, «terminé» mira las últimas 24 h: lo de desde la daily de ayer. */
export const HORAS_DEL_PARTE = 24;

export const PATRON_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;
export const LARGO_MAXIMO_TITULO = 500;
export const MAXIMO_POSICIONES_POR_LOTE = 5000;

/**
 * Lo que falta después de cerrar (URL commit, evidencias, wiki): una columna a la derecha de CERRADO (Freddy, 2026-10-18:
 * «a la derecha… estas son las cosas que me faltaron después de haber cerrado»). Un trámite va acá sea cual sea su
 * sección en el tablero de origen: en ENTENDIMIENTO parecía trabajo por entender.
 */
export const ETAPA_TRAMITES = 'TRÁMITES DE CIERRE';

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
  'APROBADO',
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
/** La clave del catálogo para los trámites de cierre que deja `importar:fases` (FASE 10). */
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
/**
 * El orden del día: las tarjetas que Freddy puso en AHORA llevan `hoy:<n>`, 1 la primera, como la ronda lleva su número
 * (sin columna nueva en la base). Lo escribe `PUT /nodos/orden-del-dia` de una vez; la VR lo muestra con el lente «hoy».
 */
export const PREFIJO_HOY = 'hoy:';
export const etiquetaDeHoy = (lugar: number) => `${PREFIJO_HOY}${lugar}`;
/** AHORA tiene 4 o 5 tarjetas: más que esto ya no es un orden del día. */
export const MAXIMO_TARJETAS_DEL_DIA = 20;
