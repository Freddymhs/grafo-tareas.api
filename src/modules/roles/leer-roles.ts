// `roles.yaml` (texto) → Roles validado. Puro. Un archivo mal escrito falla acá, con el motivo, y no a mitad
// de una importación.
import * as Joi from 'joi';
import { parse } from 'yaml';
import { CONDICIONES_SIMPLES, Roles } from './roles.types.js';

const VERSION_SOPORTADA = 1;

interface RolCrudo {
  readonly nombre: string;
  readonly para: string;
  readonly marcas: readonly string[];
  readonly grupos: Readonly<Record<string, string>>;
  readonly qa: readonly string[];
  readonly etapas: Roles['roles'][number]['etapas'];
}

interface ArchivoCrudo {
  readonly version: number;
  readonly defecto: string;
  readonly roles: Readonly<Record<string, RolCrudo>>;
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

const archivo = Joi.object<ArchivoCrudo>({
  version: Joi.number().valid(VERSION_SOPORTADA).required(),
  defecto: Joi.string().required(),
  roles: Joi.object().pattern(Joi.string(), rol).min(1).required(),
});

function coherencia({ defecto, roles }: ArchivoCrudo): readonly string[] {
  const errores: string[] = [];
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
  };
}
