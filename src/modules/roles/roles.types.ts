// Los tipos de trabajo de un área (C11): el `roles.yaml` del orquestador, ya validado. La API no conoce ningún
// área: recibe el archivo por `ROLES_ARCHIVO`. Referencia de la derivación: `~/dotfiles/tests/test_roles.py`.

/** Condiciones simples de una etapa (ver la cabecera de `roles.yaml`). */
export const CONDICIONES_SIMPLES = [
  'siempre',
  'tareas_alguna',
  'cierre_real',
  'terminada',
] as const;
export type CondicionSimple = (typeof CONDICIONES_SIMPLES)[number];

export type Condicion =
  | CondicionSimple
  | { readonly grupo: string }
  | { readonly qa: string };

export interface EtapaDeRol {
  readonly clave: string;
  /** El nombre de la columna en el tablero: tiene que estar en GET /etapas. */
  readonly columna: string;
  readonly si: Condicion;
}

export interface GrupoDeTareas {
  readonly clave: string;
  /** Calza el título de un `### ` de `## Tareas` (sin distinguir mayúsculas). */
  readonly patron: RegExp;
}

export interface Rol {
  readonly clave: string;
  readonly nombre: string;
  readonly para: string;
  /** Lo que puede decir `**Tipo**:` en una FASE de este rol. */
  readonly marcas: readonly string[];
  /** En el orden del archivo: gana el primero que calza (el último suele ser «.»). */
  readonly grupos: readonly GrupoDeTareas[];
  readonly qa: readonly string[];
  /** De la primera a la última; la etapa de una FASE es la última cuya condición se cumple. */
  readonly etapas: readonly EtapaDeRol[];
}

/** Los tipos de nodo que puede ser un complemento (FASE 9: sin migración, con los tipos que ya hay). */
export const NODOS_DE_COMPLEMENTO = ['DUDA', 'TAREA', 'DAILY_ITEM'] as const;
export type NodoDeComplemento = (typeof NODOS_DE_COMPLEMENTO)[number];
export const ESCALERAS = ['negocio', 'codigo'] as const;

/** Lo que cuelga de un PBI sin ser un rol (C11): una duda, una decisión, algo para decir… */
export interface Complemento {
  readonly clave: string;
  readonly nombre: string;
  readonly nodo: NodoDeComplemento;
  /** false = nota: no entra en «hoy puedo» ni en el tablero; se ve en el detalle de su PBI. */
  readonly accionable: boolean;
  /** Solo en una DUDA: qué escalera de `refs.yaml` sigue. */
  readonly escalera: string | null;
}

export interface Roles {
  readonly defecto: string;
  readonly roles: readonly Rol[];
  readonly complementos: readonly Complemento[];
}
