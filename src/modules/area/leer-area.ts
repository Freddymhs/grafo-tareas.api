// `refs.yaml` (texto) → lo que la API usa de él: escaleras y rituales. Puro. El resto de claves del archivo
// (tracker, tablero, repos…) no es de la API y se ignora.
import * as Joi from 'joi';
import { parse } from 'yaml';
import { ESCALERAS } from '../roles/roles.types.js';
import type { Area } from './area.types.js';

interface EscaleraCruda {
  readonly antes?: string;
  readonly personas: readonly string[];
}

interface RefsCrudo {
  readonly escalera: Readonly<Record<string, EscaleraCruda>>;
  readonly rituales: Readonly<Record<string, string>>;
}

const refs = Joi.object<RefsCrudo>({
  escalera: Joi.object()
    .pattern(
      Joi.string().valid(...ESCALERAS),
      Joi.object({
        antes: Joi.string(),
        personas: Joi.array().items(Joi.string()).min(1).required(),
      }),
    )
    // allowUnknown (para el resto de refs.yaml) baja a los objetos anidados: acá una escalera desconocida falla.
    .unknown(false)
    .default({}),
  rituales: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
});

export function leerArea(texto: string): Area {
  const resultado: Joi.ValidationResult<RefsCrudo> = refs.validate(
    parse(texto) as unknown,
    { allowUnknown: true, abortEarly: false },
  );
  if (resultado.error) {
    throw new Error(`refs.yaml inválido: ${resultado.error.message}`);
  }
  const { escalera, rituales } = resultado.value;
  return {
    escaleras: Object.entries(escalera).map(([clave, e]) => ({
      clave,
      antes: e.antes ?? null,
      personas: e.personas,
    })),
    rituales: Object.entries(rituales).map(([clave, nombre]) => ({
      clave,
      nombre,
    })),
  };
}
