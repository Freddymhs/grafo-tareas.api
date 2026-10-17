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
