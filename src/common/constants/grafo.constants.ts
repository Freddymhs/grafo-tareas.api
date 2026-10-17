import { TipoConexion, TipoNodo } from '@prisma/client';

/** Conexiones que bloquean a su origen mientras el destino siga ABIERTO (docs/_CONCEPTO.md § Modelo de dominio). */
export const CONEXIONES_BLOQUEANTES: readonly TipoConexion[] = [
  TipoConexion.DEPENDE_DE,
  TipoConexion.ESPERA_RESPUESTA_DE,
  TipoConexion.BLOQUEADA_POR,
];

/** Lo que es trabajo propio: "hoy puedo…" solo lista esto. RAMA, PERSONA, DUDA y PR bloquean, no se hacen. */
export const TIPOS_ACCIONABLES: readonly TipoNodo[] = [
  TipoNodo.TAREA,
  TipoNodo.HISTORIA,
  TipoNodo.FASE,
  TipoNodo.DAILY_ITEM,
];

export const PATRON_COLOR_HEX = /^#[0-9a-fA-F]{6}$/;
export const LARGO_MAXIMO_TITULO = 500;
export const MAXIMO_POSICIONES_POR_LOTE = 5000;
