// La etapa de una FASE_*.md según su rol de `roles.yaml` (C11). Puro: texto + roles → rol y etapa. Port de
// `derivar`/`rol_de` de `~/dotfiles/tests/test_roles.py`, la implementación de referencia: tienen que dar lo mismo.
import type {
  Condicion,
  EtapaDeRol,
  Rol,
  Roles,
} from '../../modules/roles/roles.types.js';

const SECCIONES_DE_CIERRE = [
  'Understand',
  'Tareas',
  'QA',
  'Cierre oficial en Azure',
] as const;
const CIERRE = 'Cierre oficial en Azure';
/** Lo que prueba que la FASE ya salió: un commit, evidencias, la wiki, o el PBI creado (Negocio). */
const CASILLAS_DE_CIERRE_REAL = [
  'URL commit',
  'Evidencias',
  'Wiki',
  'PBI creado',
] as const;
const CASILLA = /^\s*- \[([ x~])\]/gm;
const HECHA = /^\s*- \[x\]/m;
const TIPO = /^\*\*Tipo\*\*:\s*(\S+)/m;
const NO_APLICA = '— no aplica';

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** El cuerpo de `## <titulo>` hasta el próximo `## `; null si la sección no está. */
export function seccion(md: string, titulo: string): string | null {
  const partes = md.split(new RegExp(`^## ${escapar(titulo)}$`, 'm'));
  if (partes.length < 2) return null;
  return (partes[1] ?? '').split(/^## /m)[0] ?? '';
}

/** `[x]` de verdad: una casilla `— no aplica` cuenta para terminar la FASE, no como avance. */
function tildada(texto: string | null, etiqueta: string): boolean {
  const linea = (texto ?? '').match(
    new RegExp(`^- \\[([ x])\\] ${escapar(etiqueta)}\\b(.*)$`, 'm'),
  );
  return linea?.[1] === 'x' && !(linea[2] ?? '').includes(NO_APLICA);
}

/** Todas las casillas de Understand, Tareas, QA y Cierre tildadas (regla de `bin/fases`). */
export function terminada(md: string): boolean {
  const partes = SECCIONES_DE_CIERRE.map((titulo) => seccion(md, titulo));
  if (partes.some((parte) => parte === null)) return false;
  const casillas = [...partes.join('').matchAll(CASILLA)].map((m) => m[1]);
  return casillas.length > 0 && casillas.every((c) => c === 'x');
}

/** Las casillas de cada `### ` de `## Tareas`, en el primer grupo cuyo patrón calza el título. */
function tareasDelGrupo(md: string, rol: Rol, grupo: string): string {
  const partes = (seccion(md, 'Tareas') ?? '').split(/^### /m).slice(1);
  return partes
    .filter((parte) => {
      const titulo = parte.split('\n')[0] ?? '';
      const primero = rol.grupos.find(({ patron }) => patron.test(titulo));
      return primero?.clave === grupo;
    })
    .join('\n');
}

function cumple(condicion: Condicion, md: string, rol: Rol): boolean {
  if (condicion === 'siempre') return true;
  if (condicion === 'tareas_alguna')
    return HECHA.test(seccion(md, 'Tareas') ?? '');
  if (condicion === 'cierre_real') {
    const cierre = seccion(md, CIERRE);
    return CASILLAS_DE_CIERRE_REAL.some((casilla) => tildada(cierre, casilla));
  }
  if (condicion === 'terminada') return terminada(md);
  if ('qa' in condicion) return tildada(seccion(md, 'QA'), condicion.qa);
  return HECHA.test(tareasDelGrupo(md, rol, condicion.grupo));
}

/** La última etapa cuya condición se cumple; si ninguna, la primera. */
export function derivarEtapa(md: string, rol: Rol): EtapaDeRol {
  const cumplidas = rol.etapas.filter(({ si }) => cumple(si, md, rol));
  const primera = rol.etapas[0];
  if (!primera) throw new Error(`el rol ${rol.clave} no tiene etapas`);
  return cumplidas.at(-1) ?? primera;
}

/** El rol que declara `**Tipo**:`; sin la línea, o con una marca que nadie tiene, el `defecto`. */
export function rolDeFase(md: string, { defecto, roles }: Roles): Rol {
  const marca = md.match(TIPO)?.[1]?.toLowerCase();
  const declarado = roles.find(
    ({ marcas }) => marca !== undefined && marcas.includes(marca),
  );
  const rol = declarado ?? roles.find(({ clave }) => clave === defecto);
  if (!rol) throw new Error(`defecto «${defecto}» no es un rol`);
  return rol;
}
