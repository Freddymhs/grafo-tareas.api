# grafo-tareas.api

La fuente de verdad de `grafo-tareas`: tareas como **grafo**, no como árbol. Nació de `Freddymhs/template-nest`
(NestJS 11 + Fastify + Prisma 7 + Postgres); el plan vive en el orquestador: `../docs/_CONCEPTO.md` y
`../docs/backlog/FASE_2_API_GRAFO.md`.

**La API no conoce ninguna herramienta** (ni Todoist, ni Azure): solo nodos, conexiones y ramas. Lo único que
nombra una herramienta son los importadores (`src/importadores/`, FASE 3). El CI lo verifica con un grep.

## El dominio

|              |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nodo**     | `tipo` (TAREA, HISTORIA, FASE, RAMA, DUDA, PERSONA, PR, DAILY_ITEM) · `titulo` · `estado` (ABIERTO/CERRADO) · `color` (solo RAMA) · `externo {origen, id}` (de dónde se importó, único) · `pos {x,y,z}` (el mapa 3D, persistido)                                                                                                                                                                                     |
| **Conexión** | `origen → destino` con `tipo`: DEPENDE_DE, ESPERA_RESPUESTA_DE, BLOQUEADA_POR (bloquean al origen mientras el destino siga ABIERTO), PERTENECE_A (a una rama), EN_DAILY_DE                                                                                                                                                                                                                                           |
| **Derivado** | se calcula **acá y solo acá** (C1): `bloqueado` (qué lo frena), `hoy-puedo` (trabajo abierto que nada bloquea), `libera` (si este nodo se cierra —alguien contesta—, qué queda libre, directo y en cadena; `WITH RECURSIVE` + punto fijo, termina con ciclos), `plan` (columnas por carril; cada pieza con sus `pelotitas`: su carril y los otros que espera por DEPENDE_DE; y su `orden` en la cadena de su carril) |

## Rutas (prefijo `/api/v1`, Swagger en `/docs`)

```
GET/POST        nodos               PATCH/DELETE nodos/:id        PUT nodos/posiciones (lote, todo o nada)
GET/POST        conexiones          DELETE conexiones/:id
GET/POST        ramas               (ramas con cuántos nodos tiene cada una)
GET             derivado/dia (terminé · en curso · detenido · para decir · trámites, FASE 10)
GET             derivado/hoy-puedo  GET nodos/:id/bloqueado       GET nodos/:id/libera
GET             etapas              roles   (GET nodos?rol=<clave>: los nodos de ese rol)
GET/POST        nodos/:id/complementos   POST nodos/:id/escalar   POST nodos/:id/decidir   GET area
POST            piezas              (una pieza del reparto en el plan de su HU, FASE 19)
GET             health
```

**Piezas (FASE 19).** Una pieza del reparto entra al grafo por dos caminos: el importador del tablero y `POST /piezas`
(lo usa el adaptador `grafo` en `borrador`). Los dos aplican la misma regla, `src/importadores/pieza.ts`: cara PLAN,
etiquetas `pieza` y `ronda:N`, y la pieza `PERTENECE_A` su HU —la de la cabecera de la especificación— y a la RAMA de su
carril (la columna de `GET /derivado/plan`). Sin esa cabecera, o con un carril que no es `<letra> · <zona>`, 400.

**Roles (FASE 8, C11).** Con `ROLES_ARCHIVO` apuntando al `docs/roles.yaml` del área, `GET /roles` da los tipos de
trabajo y las columnas de cada tablero, y `GET /etapas` suma esas columnas a la lista del tablero (`ETAPAS`, C9). El
rol de un nodo es una etiqueta con la clave del rol; sin ninguna, es el `defecto`. Sin `ROLES_ARCHIVO`, no hay roles y
todo funciona como antes.

**Complementos (FASE 9, C11).** Lo que cuelga de un PBI sin ser un rol: el catálogo está en el mismo `roles.yaml`
(`complementos:`), cada uno es un nodo DUDA/TAREA/DAILY_ITEM con la etiqueta `complemento:<clave>` y `PERTENECE_A` su PBI.
Una duda frena a su PBI; `escalar` la pasa al siguiente de la escalera del área y `decidir` la cierra dejando la
decisión. Escaleras, rituales y personas salen del `refs.yaml` del área (`REFS_ARCHIVO`, `GET /area`). Las notas (no
accionables) no entran en `hoy-puedo` y `GET /nodos?notas=ocultar` las saca del tablero.

`openapi.json` es el contrato versionado: la PWA y la VR generan sus tipos y hooks de ahí (Orval). Se regenera con
`pnpm openapi:export` y el CI falla si quedó atrás del código.

## Correr

```bash
docker compose up -d postgres          # Postgres 16 en 127.0.0.1:5433 (usuario/clave grafo, bases grafo_tareas y grafo_tareas_test)
cp .env.example .env
pnpm install && pnpm prisma:generate && pnpm prisma:migrate
pnpm build && pnpm start:prod           # http://localhost:3000/docs
```

Gates: `pnpm type-check` · `pnpm lint` · `pnpm test` (unit, repos mockeados) · `pnpm test:e2e` (contra `grafo_tareas_test`: — el nombre de la base lo fuerza `test/setup-e2e.ts`, no `.env`
el escenario del concepto —Tomás, una duda W2 y tres tareas— de punta a punta).

## Importar los `FASE_*.md` del método (FASE 5) — cada vez que cambian las casillas

```bash
pnpm importar:fases -- --backlog ../docs/backlog --tareas ../Tareas --seco   # cuenta, no escribe
pnpm importar:fases -- --backlog ../docs/backlog --tareas ../Tareas          # aplica en una transacción
```

Cada `FASE_n_*.md` es un nodo FASE «FASE n» con la etiqueta de su rol (`**Tipo**:`, o el defecto) y la etapa derivada de sus
casillas según `roles.yaml` (por defecto `../docs/roles.yaml`, o `--roles <archivo>`; mismas reglas que `fases.html` /
`calidad.html` y que `~/dotfiles/tests/test_roles.py`) y `DEPENDE_DE` por su **Dependencias**; cada viñeta de `## ⚠️ ABIERTO` en
`Tareas/<id>/entendimiento.md` es una DUDA que deja a la TAREA `[<id>]…` `BLOQUEADA_POR` ella, y se cierra sola cuando
desaparece del archivo (solo cuando se pasa `--tareas`: sin él, las dudas ya importadas no se tocan). Idempotente por
`externo { fases-md:<proyecto>, fase:n | abierto:<id>:n }`; el proyecto es el nombre del orquestador o `--proyecto`, así
las FASE de dos orquestadores no se pisan. Cada FASE se titula `FASE n · Nombre · task` y la primera línea de su descripción es el avance de fases.html. Con
`--adoptar todoist`, la «FASE n» que dejó Todoist pasa a ser la del `.md` (mismo nodo, sus conexiones): lo que se usa para
el Laboratorio. Solo lee los archivos.

## Importar desde Todoist (FASE 3) — una vez, como migración

```bash
pnpm importar:todoist -- --proyecto <id-del-proyecto> --seco   # traduce y cuenta, no escribe
pnpm importar:todoist -- --proyecto <id-del-proyecto>          # aplica el plan en una transacción
```

Lee con `TODOIST_API_KEY` (del entorno, nunca del repo) y **nunca escribe en Todoist**. Es idempotente: la segunda
corrida actualiza y no duplica (`externo {todoist, id}`). Las reglas (secciones → estado, subtareas → el padre
DEPENDE_DE las hijas, círculos → ramas, `FASE n` → nodo FASE, `BLOQUEO … esperando a <persona>` → ESPERA_RESPUESTA_DE,
con la persona reconocida por sus alias del `personas:` del `refs.yaml` del área: sin esa clave, no se crea ninguna)
están en `src/importadores/todoist/traducir.ts`, una función pura con test sobre un fixture real
(`test/fixtures/todoist/`), y se decidieron en `../docs/backlog/FASE_3_IMPORTADOR_TODOIST.md`.

## Convenciones

- Un módulo por dominio (`src/modules/{nodos,conexiones,ramas,derivado}`), cada uno `controller → service → repository`.
- Los errores de dominio son `DomainError` (404 `NotFoundError`, 400 `ValidationError`, 409 `ConflictError`); el filtro global los traduce.
- Constantes del grafo en `src/common/constants/grafo.constants.ts`: qué conexiones bloquean, qué tipos son trabajo.
- `calcular-libera.ts` es una función pura con su test: la regla de "qué se libera" no toca la base.
