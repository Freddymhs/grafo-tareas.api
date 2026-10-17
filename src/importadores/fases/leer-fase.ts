// Lee UNA FASE_*.md del método y deriva su etapa de las casillas, con las mismas reglas que las vistas del
// Laboratorio (`fases.html` para la FASE típica, `calidad.html` para `**Tipo**: calidad`). Puro: texto → datos.
import { ClaveEtapa } from '../../common/constants/grafo.constants.js';

export interface FaseLeida {
  readonly numero: number;
  /** El título del `# FASE n: …` sin el prefijo. */
  readonly titulo: string;
  readonly destraba: string | null;
  readonly calidad: boolean;
  /** Números de FASE citados en `**Dependencias**` (sin la propia). */
  readonly dependencias: readonly number[];
  readonly etapa: ClaveEtapa;
  /** Todas las casillas de Understand, Tareas, QA y Cierre tildadas: la FASE queda en solo lectura. */
  readonly terminada: boolean;
}

const SECCIONES_DE_CIERRE = [
  'Understand',
  'Tareas',
  'QA',
  'Cierre oficial en Azure',
] as const;
const CASILLA = /^\s*- \[([ x~])\]/gm;
const HECHA = /^\s*- \[x\]/gm;
const ES_CALIDAD = /^\*\*Tipo\*\*:\s*calidad\b/m;
const AMARRAR = /amarrar|l[ií]nea base|arranque/i;
const RED = /^red\b|cierre de la malla|retirar/i;
const NUMERO_DE_FASE = /^# FASE (\d+)\s*:?\s*(.*)$/m;
const NUMERO_EN_NOMBRE = /^FASE_(\d+)_/;
const CAMPO = (nombre: string) =>
  new RegExp(`^\\*\\*${nombre}\\*\\*:\\s*(.*)$`, 'm');
const FASES_CITADAS = /FASE\s+(\d+)/g;

export function seccion(md: string, titulo: string): string {
  const partes = md.split(new RegExp(`^## ${titulo}$`, 'm'));
  return (partes[1] ?? '').split(/^## /m)[0] ?? '';
}

const contar = (texto: string, patron: RegExp) =>
  (texto.match(patron) ?? []).length;

/** `[x]` de verdad: una casilla `— no aplica` cuenta para terminar la FASE, no como avance. */
function casillaHecha(texto: string, etiqueta: string): boolean {
  const linea = texto.match(
    new RegExp(`^- \\[([ x])\\] ${etiqueta}\\b([^\\n]*)`, 'm'),
  );
  return linea?.[1] === 'x' && !/— no aplica/.test(linea[2] ?? '');
}

/** El cierre tiene algo real tildado (URL commit, Evidencias o Wiki): la FASE ya se mergeó. */
function cierreReal(md: string): boolean {
  const cierre = seccion(md, 'Cierre oficial en Azure');
  return ['URL commit', 'Evidencias', 'Wiki'].some((e) =>
    casillaHecha(cierre, e),
  );
}

export function terminada(md: string): boolean {
  const partes = SECCIONES_DE_CIERRE.map((nombre) => {
    const encontrada = md.match(new RegExp(`^## ${nombre}$`, 'm'));
    return encontrada ? seccion(md, nombre) : null;
  });
  if (partes.some((parte) => parte === null)) return false;
  const casillas = [...partes.join('').matchAll(CASILLA)].map((m) => m[1]);
  return casillas.length > 0 && casillas.every((c) => c === 'x');
}

/** Agrupa las `###` de `## Tareas` en amarrar / cambiar / red por su nombre (como calidad.html). */
function tareasDeCalidad(md: string) {
  const grupos = { amarrar: '', cambiar: '', red: '' };
  const partes = seccion(md, 'Tareas').split(/^### /m).slice(1);
  for (const parte of partes) {
    const titulo = parte.split('\n')[0] ?? '';
    const grupo = AMARRAR.test(titulo)
      ? 'amarrar'
      : RED.test(titulo)
        ? 'red'
        : 'cambiar';
    grupos[grupo] += `\n${parte}`;
  }
  return grupos;
}

function etapaTipica(md: string): ClaveEtapa {
  const qa = seccion(md, 'QA');
  if (casillaHecha(qa, 'Listo para PR')) return 'listo';
  if (casillaHecha(qa, 'Auditoría')) return 'auditoria';
  if (casillaHecha(qa, 'Colección')) return 'coleccion';
  if (contar(seccion(md, 'Tareas'), HECHA) > 0) return 'codigo';
  return 'entendimiento';
}

function etapaCalidad(md: string): ClaveEtapa {
  if (casillaHecha(seccion(md, 'QA'), 'Listo para PR')) return 'pr';
  const grupos = tareasDeCalidad(md);
  if (contar(grupos.red, HECHA) > 0) return 'red';
  if (contar(grupos.cambiar, HECHA) > 0) return 'cambiar';
  if (contar(grupos.amarrar, HECHA) > 0) return 'amarrar';
  return 'entendimiento';
}

export function derivarEtapa(md: string): ClaveEtapa {
  if (terminada(md)) return 'cerrado';
  if (cierreReal(md)) return 'aprobado';
  return ES_CALIDAD.test(md) ? etapaCalidad(md) : etapaTipica(md);
}

export function leerFase(nombreArchivo: string, md: string): FaseLeida {
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
  return {
    numero,
    titulo: (encabezado?.[2] ?? '').trim(),
    destraba: md.match(CAMPO('Destraba'))?.[1]?.trim() ?? null,
    calidad: ES_CALIDAD.test(md),
    dependencias: [...new Set(dependencias)],
    etapa: derivarEtapa(md),
    terminada: terminada(md),
  };
}
