# grafo-tareas.api

La fuente de verdad de `grafo-tareas`: tareas como **grafo**, no como árbol. Nació de `Freddymhs/template-nest`
(NestJS 11 + Fastify + Prisma 7 + Postgres); el plan vive en el orquestador: `../docs/_CONCEPTO.md` y
`../docs/backlog/FASE_2_API_GRAFO.md`.

**La API no conoce ninguna herramienta** (ni Todoist, ni Azure): solo nodos, conexiones y ramas. Lo único que
nombra una herramienta son los importadores (`src/importadores/`, FASE 3). El CI lo verifica con un grep.

## El dominio

|              |                                                                                                                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nodo**     | `tipo` (TAREA, HISTORIA, FASE, RAMA, DUDA, PERSONA, PR, DAILY_ITEM) · `titulo` · `estado` (ABIERTO/CERRADO) · `color` (solo RAMA) · `externo {origen, id}` (de dónde se importó, único) · `pos {x,y,z}` (el mapa 3D, persistido)                              |
| **Conexión** | `origen → destino` con `tipo`: DEPENDE_DE, ESPERA_RESPUESTA_DE, BLOQUEADA_POR (bloquean al origen mientras el destino siga ABIERTO), PERTENECE_A (a una rama), EN_DAILY_DE                                                                                    |
| **Derivado** | se calcula **acá y solo acá** (C1): `bloqueado` (qué lo frena), `hoy-puedo` (trabajo abierto que nada bloquea), `libera` (si este nodo se cierra —alguien contesta—, qué queda libre, directo y en cadena; `WITH RECURSIVE` + punto fijo, termina con ciclos) |

## Rutas (prefijo `/api/v1`, Swagger en `/docs`)

```
GET/POST        nodos               PATCH/DELETE nodos/:id        PUT nodos/posiciones (lote, todo o nada)
GET/POST        conexiones          DELETE conexiones/:id
GET/POST        ramas               (ramas con cuántos nodos tiene cada una)
GET             derivado/hoy-puedo  GET nodos/:id/bloqueado       GET nodos/:id/libera
GET             health
```

`openapi.json` es el contrato versionado: la PWA y la VR generan sus tipos y hooks de ahí (Orval). Se regenera con
`pnpm openapi:export` y el CI falla si quedó atrás del código.

## Correr

```bash
docker compose up -d postgres          # Postgres 16 en 127.0.0.1:5433 (usuario/clave grafo, bases grafo_tareas y grafo_tareas_test)
cp .env.example .env
pnpm install && pnpm prisma:generate && pnpm prisma:migrate
pnpm build && pnpm start:prod           # http://localhost:3000/docs
```

Gates: `pnpm type-check` · `pnpm lint` · `pnpm test` (unit, repos mockeados) · `pnpm test:e2e` (contra `grafo_tareas_test`:
el escenario del concepto —Tomás, una duda W2 y tres tareas— de punta a punta).

## Importar desde Todoist (FASE 3) — una vez, como migración

```bash
pnpm importar:todoist -- --proyecto <id-del-proyecto> --seco   # traduce y cuenta, no escribe
pnpm importar:todoist -- --proyecto <id-del-proyecto>          # aplica el plan en una transacción
```

Lee con `TODOIST_API_KEY` (del entorno, nunca del repo) y **nunca escribe en Todoist**. Es idempotente: la segunda
corrida actualiza y no duplica (`externo {todoist, id}`). Las reglas (secciones → estado, subtareas → el padre
DEPENDE_DE las hijas, círculos → ramas, `FASE n` → nodo FASE, `BLOQUEO … esperando a <persona>` → ESPERA_RESPUESTA_DE)
están en `src/importadores/todoist/traducir.ts`, una función pura con test sobre un fixture real
(`test/fixtures/todoist/`), y se decidieron en `../docs/backlog/FASE_3_IMPORTADOR_TODOIST.md`.

## Convenciones

- Un módulo por dominio (`src/modules/{nodos,conexiones,ramas,derivado}`), cada uno `controller → service → repository`.
- Los errores de dominio son `DomainError` (404 `NotFoundError`, 400 `ValidationError`, 409 `ConflictError`); el filtro global los traduce.
- Constantes del grafo en `src/common/constants/grafo.constants.ts`: qué conexiones bloquean, qué tipos son trabajo.
- `calcular-libera.ts` es una función pura con su test: la regla de "qué se libera" no toca la base.
