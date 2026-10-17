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
