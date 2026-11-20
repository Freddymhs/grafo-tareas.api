# grafo-tareas.api

La fuente de verdad de `grafo-tareas`: tareas como **grafo**, no como árbol. Nació de `Freddymhs/template-nest`
(NestJS 11 + Fastify + Prisma 7 + Postgres); el plan vive en el orquestador: `../docs/_CONCEPTO.md` y
`../docs/backlog/FASE_2_API_GRAFO.md`.

**La API no conoce ninguna herramienta**: solo nodos, conexiones y ramas, sin excepciones (desde la FASE 25 no tiene
importadores). El CI lo verifica con un grep sobre `src`. Una FASE llega al grafo como tarjeta, por el adaptador
`grafo` del orquestador; sus casillas y criterios siguen en su `.md`.

## El dominio

|              |                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Espacio**  | pestaña de nivel 1 (SIGSA, Mis máquinas…) con sus `proyectos` y sus tipos de nodo; `metodo` (`trabajo-hu` o nada) enciende roles, día, páginas y piezas solo ahí (FASE 22)                                                                                                                                                                                                                                           |
| **Nodo**     | `proyectoId` (obligatorio; sin él cae en el proyecto por defecto, `X-Aviso-Proyecto`) · `tipo` (un `TipoNodo` del espacio: SIGSA trae TAREA, HISTORIA, FASE, RAMA, DUDA, PERSONA, PR, DAILY_ITEM) · `titulo` · `estado` (ABIERTO/CERRADO; `null` si el tipo no tiene ciclo) · `color` (solo RAMA) · `externo {origen, id}` (de dónde se importó, único) · `pos {x,y,z}` (el mapa 3D, persistido)                     |
| **Conexión** | `origen → destino` con `tipo` (una fila de `tipos_conexion`, global): DEPENDE_DE, ESPERA_RESPUESTA_DE, BLOQUEADA_POR (bloquean al origen mientras el destino siga ABIERTO), PERTENECE_A (a una rama), EN_DAILY_DE, SE_RELACIONA_CON, DERIVA_DE                                                                                                                                                                       |
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
GET/POST        espacios            PATCH/DELETE espacios/:id     GET/POST espacios/:id/proyectos   PATCH/DELETE proyectos/:id
GET/POST        espacios/:id/tipos-nodo   PATCH tipos-nodo/:id   GET/POST tipos-conexion   GET proyectos/:id/vecinos (FASE 22)
GET             health
```

**Piezas (FASE 19).** Una pieza del reparto entra al grafo por `POST /piezas` (lo usa el adaptador `grafo` en
`borrador`), con la regla de `src/modules/piezas/pieza.ts`: cara PLAN,
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
pnpm install && pnpm prisma:generate && pnpm prisma:migrate   # migrate y studio cargan .env con `node --env-file`: Prisma 7 ya no lo lee solo
pnpm build && pnpm start:prod           # http://localhost:3000/docs
```

Gates: `pnpm type-check` · `pnpm lint` (arregla; el CI corre `pnpm lint:ci`, sin `--fix`, que falla de verdad) · `pnpm test` (unit, repos mockeados) · `pnpm test:e2e` (contra `grafo_tareas_test`: — el nombre de la base lo fuerza `test/setup-e2e.ts`, no `.env`
el escenario del concepto —Persona A, una duda W2 y tres tareas— de punta a punta).

## Convenciones

- Un módulo por dominio (`src/modules/{nodos,conexiones,ramas,derivado}`), cada uno `controller → service → repository`.
- Los errores de dominio son `DomainError` (404 `NotFoundError`, 400 `ValidationError`, 409 `ConflictError`); el filtro global los traduce.
- Constantes del grafo en `src/common/constants/grafo.constants.ts`: qué conexiones bloquean, qué tipos son trabajo.
- `calcular-libera.ts` es una función pura con su test: la regla de "qué se libera" no toca la base.
