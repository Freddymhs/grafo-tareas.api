/**
 * Los e2e vacían la base entera en `beforeAll`: NUNCA pueden correr contra la base de trabajo.
 * Corre antes de que Nest cargue `.env` (jest `setupFiles`): fuerza una base cuyo nombre termina en `_test`.
 * Real 2026-10-17: tres corridas de e2e borraron las 134 tareas importadas de `grafo_tareas`.
 */
const URL_LOCAL_POR_DEFECTO =
  'postgresql://grafo:grafo@localhost:5433/grafo_tareas?schema=public';
const SUFIJO_PRUEBA = '_test';

const url = new URL(process.env['DATABASE_URL'] ?? URL_LOCAL_POR_DEFECTO);
if (!url.pathname.endsWith(SUFIJO_PRUEBA)) {
  url.pathname = `${url.pathname}${SUFIJO_PRUEBA}`;
}
process.env['DATABASE_URL'] = url.toString();
