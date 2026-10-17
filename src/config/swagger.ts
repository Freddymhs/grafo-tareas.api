import { DocumentBuilder } from '@nestjs/swagger';

/** Una sola definición: la usan `main.ts` (los /docs en vivo) y `openapi.ts` (el `openapi.json` versionado). */
export const SWAGGER_CONFIG = new DocumentBuilder()
  .setTitle('grafo-tareas API')
  .setDescription(
    'Tareas como grafo: nodos, conexiones, ramas y lo derivado (bloqueado, hoy puedo, qué se libera)',
  )
  .setVersion('1.0')
  .build();
