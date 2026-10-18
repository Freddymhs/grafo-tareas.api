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

/** La casilla «Mergeado» de `## QA` tildada (FASE 17): la tilda Freddy con `/flow:tildar`; ningún importador la deduce. */
export function mergeada(md: string): boolean {
  return tildada(seccion(md, 'QA'), 'Mergeado');
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

/** La casilla de QA que dice «ya se entregó» (el PR); un rol sin ella (Negocio) se entrega con su última. */
const CASILLA_DE_ENTREGA = 'Listo para PR';

/**
 * Lo que falta del cierre oficial de una FASE ya entregada: las casillas reales (URL commit, Evidencias, Wiki,
 * PBI creado) todavía sin tildar. null = no hay trámite: la FASE no se entregó, o no tiene cierre real (tracker: none,
 * «Cierre oficial — no aplica»). FASE 10.
 */
export function cierrePendiente(
  md: string,
  rol: Rol,
): readonly string[] | null {
  const entrega = rol.qa.includes(CASILLA_DE_ENTREGA)
    ? CASILLA_DE_ENTREGA
    : rol.qa.at(-1);
  if (entrega === undefined || !tildada(seccion(md, 'QA'), entrega))
    return null;
  const cierre = seccion(md, CIERRE) ?? '';
  const casilla = (marca: string, nombre: string) =>
    new RegExp(`^- \\[${marca}\\] ${escapar(nombre)}\\b`, 'm').test(cierre);
  const reales = CASILLAS_DE_CIERRE_REAL.filter((nombre) =>
    casilla('[ x]', nombre),
  );
  if (reales.length === 0) return null;
  return reales.filter((nombre) => casilla(' ', nombre));
}

const CASILLA_HECHA = /^\s*- \[x\]/gm;
const CASILLA_CUALQUIERA = /^\s*- \[[ x~]\]/gm;
const contar = (texto: string, patron: RegExp) =>
  (texto.match(patron) ?? []).length;
const fraccion = (texto: string) =>
  `${contar(texto, CASILLA_HECHA)}/${contar(texto, CASILLA_CUALQUIERA)}`;
const ETIQUETA_CORTA: Readonly<Record<string, string>> = {
  'Listo para PR': 'PR',
};

/** ✓ hecha · — no aplica · ✗ pendiente: la marca de una casilla de QA, como en fases.html. */
function marca(texto: string | null, etiqueta: string): string {
  const linea = (texto ?? '').match(
    new RegExp(`^- \\[([ x])\\] ${escapar(etiqueta)}\\b(.*)$`, 'm'),
  );
  if ((linea?.[2] ?? '').includes(NO_APLICA)) return '—';
  return linea?.[1] === 'x' ? '✓' : '✗';
}

/**
 * La línea de avance de una FASE, la de las tarjetas de fases.html / calidad.html (FASE 11):
 * `entender ✓ · amarrar 15/15 · cambiar 3/3 · red 4/4 · PR ✗ · falta URL commit, Evidencias, Wiki`.
 */
export function avance(md: string, rol: Rol): string {
  const understand = seccion(md, 'Understand') ?? '';
  const entendida =
    contar(understand, CASILLA_CUALQUIERA) > 0 &&
    contar(understand, CASILLA_HECHA) ===
      contar(understand, CASILLA_CUALQUIERA);
  // En el orden de las etapas (amarrar, cambiar, red), no en el de calce de los grupos (cambiar va último: «.»).
  const enOrden = [
    ...rol.etapas.flatMap(({ si }) =>
      typeof si === 'object' && 'grupo' in si ? [si.grupo] : [],
    ),
    ...rol.grupos.map(({ clave }) => clave),
  ];
  const grupos = [...new Set(enOrden)];
  const tareas =
    grupos.length > 0
      ? grupos.map((clave) => {
          const delGrupo = tareasDelGrupo(md, rol, clave);
          return contar(delGrupo, CASILLA_CUALQUIERA) > 0
            ? `${clave} ${fraccion(delGrupo)}`
            : `${clave} —`;
        })
      : [`tareas ${fraccion(seccion(md, 'Tareas') ?? '')}`];
  const qa = seccion(md, 'QA');
  const deQa = rol.qa.map(
    (casilla) =>
      `${ETIQUETA_CORTA[casilla] ?? casilla.toLowerCase()} ${marca(qa, casilla)}`,
  );
  const cierre = seccion(md, CIERRE) ?? '';
  const reales = CASILLAS_DE_CIERRE_REAL.filter((nombre) =>
    new RegExp(`^- \\[[ x]\\] ${escapar(nombre)}\\b`, 'm').test(cierre),
  );
  const faltan = reales.filter((nombre) =>
    new RegExp(`^- \\[ \\] ${escapar(nombre)}\\b`, 'm').test(cierre),
  );
  const deCierre =
    reales.length === 0
      ? []
      : faltan.length > 0
        ? [`falta ${faltan.join(', ')}`]
        : ['cierre ✓'];
  return [
    `entender ${entendida ? '✓' : '✗'}`,
    ...tareas,
    ...deQa,
    ...deCierre,
  ].join(' · ');
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
