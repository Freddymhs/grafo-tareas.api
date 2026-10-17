// Lee UNA FASE_*.md del método: número, título, Destraba, Dependencias, y su rol y etapa según `roles.yaml`
// (`derivar-por-rol.ts`, la misma regla que `fases.html`/`calidad.html` y `test_roles.py`). Puro: texto → datos.
import type { Roles } from '../../modules/roles/roles.types.js';
import {
  cierrePendiente,
  derivarEtapa,
  rolDeFase,
  terminada,
} from './derivar-por-rol.js';

export interface FaseLeida {
  readonly numero: number;
  /** El título del `# FASE n: …` sin el prefijo. */
  readonly titulo: string;
  readonly destraba: string | null;
  /** La clave del rol en `roles.yaml` (de `**Tipo**:`, o el defecto). */
  readonly rol: string;
  /** Números de FASE citados en `**Dependencias**` (sin la propia). */
  readonly dependencias: readonly number[];
  /** La columna del tablero que le toca por sus casillas. */
  readonly etapa: string;
  /** Todas las casillas de Understand, Tareas, QA y Cierre tildadas: la FASE queda en solo lectura. */
  readonly terminada: boolean;
  /** Entregada y con casillas reales del cierre sin tildar (URL commit, Evidencias…); null = no entregada. */
  readonly cierrePendiente: readonly string[] | null;
}

const NUMERO_DE_FASE = /^# FASE (\d+)\s*:?\s*(.*)$/m;
const NUMERO_EN_NOMBRE = /^FASE_(\d+)_/;
const CAMPO = (nombre: string) =>
  new RegExp(`^\\*\\*${nombre}\\*\\*:\\s*(.*)$`, 'm');
const FASES_CITADAS = /FASE\s+(\d+)/g;

export function leerFase(
  nombreArchivo: string,
  md: string,
  roles: Roles,
): FaseLeida {
  const encabezado = md.match(NUMERO_DE_FASE);
  const numeroEnNombre = nombreArchivo.match(NUMERO_EN_NOMBRE)?.[1];
  const numero = Number(encabezado?.[1] ?? numeroEnNombre);
  if (!Number.isInteger(numero)) {
    throw new Error(
      `${nombreArchivo}: no tiene \`# FASE n\` ni número en el nombre`,
    );
  }
  const dependencias = [
    ...(md.match(CAMPO('Dependencias'))?.[1] ?? '').matchAll(FASES_CITADAS),
  ]
    .map((m) => Number(m[1]))
    .filter((n) => n !== numero);
  const rol = rolDeFase(md, roles);
  return {
    numero,
    titulo: (encabezado?.[2] ?? '').trim(),
    destraba: md.match(CAMPO('Destraba'))?.[1]?.trim() ?? null,
    rol: rol.clave,
    dependencias: [...new Set(dependencias)],
    etapa: derivarEtapa(md, rol).columna,
    terminada: terminada(md),
    cierrePendiente: cierrePendiente(md, rol),
  };
}
