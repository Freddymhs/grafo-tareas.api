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

export const PATRON_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;
export const LARGO_MAXIMO_TITULO = 500;
export const MAXIMO_POSICIONES_POR_LOTE = 5000;

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
  '🔎 Precheck fin de sprint (archivadas)',
];
export const PRIORIDAD_MINIMA = 1;
export const PRIORIDAD_MAXIMA = 4;
export const LARGO_MAXIMO_ETIQUETA = 50;
export const LARGO_MAXIMO_BUSQUEDA = 200;
/** Un listado no devuelve más que esto por página (el tablero pide 500 y le alcanza). */
export const LIMITE_MAXIMO_PAGINA = 500;

/**
 * Las etapas del método por su clave (las de `tablero.secciones` del Laboratorio y las que `fases.html` /
 * `calidad.html` derivan de las casillas de una FASE_*.md). El importador de FASEs habla en claves y las
 * traduce acá; los nombres tienen que existir en ETAPAS.
 */
export const ETAPA_DEL_METODO = {
  entendimiento: 'ENTENDIMIENTO',
  codigo: 'EN CODIGO',
  coleccion: 'Collection Created',
  auditoria: 'TESTEADO',
  listo: 'LISTO PARA PR',
  amarrar: 'AMARRAR 🧰',
  cambiar: 'CAMBIAR 🧰',
  red: 'RED 🧰',
  pr: 'Pull Request',
  aprobado: 'APROBADO',
  cerrado: 'CERRADO',
} as const;
export type ClaveEtapa = keyof typeof ETAPA_DEL_METODO;
