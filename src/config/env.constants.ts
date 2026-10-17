export const ENV_KEYS = {
  NODE_ENV: 'NODE_ENV',
  PORT: 'PORT',
  DATABASE_URL: 'DATABASE_URL',
  CORS_ORIGINS: 'CORS_ORIGINS',
  PINO_LOG_LEVEL: 'PINO_LOG_LEVEL',
  THROTTLE_TTL: 'THROTTLE_TTL',
  THROTTLE_LIMIT: 'THROTTLE_LIMIT',
  /** Solo la lee el importador de Todoist (FASE 3). Nunca se loguea. */
  TODOIST_API_KEY: 'TODOIST_API_KEY',
  /** Columnas del tablero separadas por coma; sin ella, ETAPAS_POR_DEFECTO. */
  ETAPAS: 'ETAPAS',
  /** El roles.yaml del área (C11); sin ella, la API no tiene roles: GET /roles vacío y GET /etapas = ETAPAS. */
  ROLES_ARCHIVO: 'ROLES_ARCHIVO',
  /** El refs.yaml del área (FASE 9): escaleras de dudas y rituales; sin ella, no hay a quién escalar. */
  REFS_ARCHIVO: 'REFS_ARCHIVO',
} as const;

export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];
