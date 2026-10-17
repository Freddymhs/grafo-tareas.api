// `roles.yaml` (texto) → Roles validado. Puro. Un archivo mal escrito falla acá, con el motivo, y no a mitad
// de una importación.
import * as Joi from 'joi';
import { parse } from 'yaml';
import {
  CONDICIONES_SIMPLES,
  ESCALERAS,
  NODOS_DE_COMPLEMENTO,
  NodoDeComplemento,
  Roles,
} from './roles.types.js';

const VERSION_SOPORTADA = 1;

interface RolCrudo {
  readonly nombre: string;
  readonly para: string;
  readonly marcas: readonly string[];
  readonly grupos: Readonly<Record<string, string>>;
  readonly qa: readonly string[];
  readonly etapas: Roles['roles'][number]['etapas'];
}

interface ComplementoCrudo {
  readonly nombre: string;
  readonly nodo: NodoDeComplemento;
  readonly accionable: boolean;
  readonly escalera?: string;
}

interface ArchivoCrudo {
  readonly version: number;
  readonly defecto: string;
  readonly roles: Readonly<Record<string, RolCrudo>>;
  readonly complementos: Readonly<Record<string, ComplementoCrudo>>;
}

const condicion = Joi.alternatives(
  Joi.string().valid(...CONDICIONES_SIMPLES),
  Joi.object({ grupo: Joi.string().required() }),
  Joi.object({ qa: Joi.string().required() }),
);

const rol = Joi.object({
  nombre: Joi.string().required(),
  para: Joi.string().required(),
  marcas: Joi.array().items(Joi.string()).min(1).required(),
  plantilla: Joi.string().required(),
  grupos: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  qa: Joi.array().items(Joi.string()).required(),
  etapas: Joi.array()
    .items(
      Joi.object({
        clave: Joi.string().required(),
        columna: Joi.string().required(),
        si: condicion.required(),
      }),
    )
    .min(1)
    .required(),
});

const complemento = Joi.object({
  nombre: Joi.string().required(),
  nodo: Joi.string()
    .valid(...NODOS_DE_COMPLEMENTO)
    .required(),
  accionable: Joi.boolean().default(true),
  escalera: Joi.string().valid(...ESCALERAS),
})
  // allowUnknown baja a los anidados: sin esto, «acionable: false» pasaría callado y la nota entraría en «hoy puedo».
  .unknown(false);

const archivo = Joi.object<ArchivoCrudo>({
  version: Joi.number().valid(VERSION_SOPORTADA).required(),
  defecto: Joi.string().required(),
  roles: Joi.object().pattern(Joi.string(), rol).min(1).required(),
  complementos: Joi.object().pattern(Joi.string(), complemento).default({}),
});

function coherencia({
  defecto,
  roles,
  complementos,
}: ArchivoCrudo): readonly string[] {
  const errores: string[] = [];
  for (const [clave, { nodo, escalera }] of Object.entries(complementos)) {
    if (escalera !== undefined && nodo !== 'DUDA') {
      errores.push(`complemento ${clave}: la escalera solo vale en una DUDA`);
    }
  }
  if (!(defecto in roles)) errores.push(`defecto «${defecto}» no es un rol`);
  const rolDeMarca = new Map<string, string>();
  for (const [clave, { marcas, grupos, etapas }] of Object.entries(roles)) {
    for (const marca of marcas) {
      const otro = rolDeMarca.get(marca);
      if (otro)
        errores.push(`la marca «${marca}» está en ${otro} y en ${clave}`);
      rolDeMarca.set(marca, clave);
    }
    for (const { clave: etapa, si } of etapas) {
      const grupo = typeof si === 'object' && 'grupo' in si ? si.grupo : null;
      if (grupo && !(grupo in grupos)) {
        errores.push(
          `${clave}: la etapa ${etapa} usa el grupo «${grupo}», que no está en grupos`,
        );
      }
    }
  }
  return errores;
}

export function leerRoles(texto: string): Roles {
  const resultado: Joi.ValidationResult<ArchivoCrudo> = archivo.validate(
    parse(texto) as unknown,
    { allowUnknown: true, abortEarly: false },
  );
  if (resultado.error) {
    throw new Error(`roles.yaml inválido: ${resultado.error.message}`);
  }
  const crudo = resultado.value;
  const errores = coherencia(crudo);
  if (errores.length > 0) {
    throw new Error(`roles.yaml inválido: ${errores.join(' · ')}`);
  }
  return {
    defecto: crudo.defecto,
    roles: Object.entries(crudo.roles).map(([clave, r]) => ({
      clave,
      nombre: r.nombre,
      para: r.para,
      marcas: r.marcas.map((marca) => marca.toLowerCase()),
      grupos: Object.entries(r.grupos).map(([grupo, patron]) => ({
        clave: grupo,
        patron: new RegExp(patron, 'i'),
      })),
      qa: r.qa,
      etapas: r.etapas,
    })),
    complementos: Object.entries(crudo.complementos).map(([clave, c]) => ({
      clave,
      nombre: c.nombre,
      nodo: c.nodo,
      accionable: c.accionable,
      escalera: c.escalera ?? null,
    })),
  };
}
