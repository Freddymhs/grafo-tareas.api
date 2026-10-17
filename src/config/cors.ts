import type { FastifyCorsOptions } from '@fastify/cors';

/** @fastify/cors solo permite GET,HEAD,POST por defecto: sin esta lista el navegador rechaza PATCH/PUT/DELETE en el preflight. */
export const METODOS_PERMITIDOS = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
] as const;

export const opcionesCors = (
  origenes: readonly string[],
): FastifyCorsOptions => ({
  origin: [...origenes],
  methods: [...METODOS_PERMITIDOS],
  credentials: true,
});
