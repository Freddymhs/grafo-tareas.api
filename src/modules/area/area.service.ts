import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidationError } from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';
import type { Area, Escalera, Ritual } from './area.types.js';
import { leerArea } from './leer-area.js';

const SIN_AREA: Area = { escaleras: [], rituales: [] };

/** Escaleras y rituales del área, leídos una vez al arrancar (como los roles). */
@Injectable()
export class AreaService {
  private readonly area: Area;

  constructor(config: ConfigService) {
    const archivo = config.get<string>(ENV_KEYS.REFS_ARCHIVO);
    this.area = archivo ? leerArea(readFileSync(archivo, 'utf8')) : SIN_AREA;
  }

  todo(): Area {
    return this.area;
  }

  escalera(clave: string): Escalera {
    const escalera = this.area.escaleras.find((e) => e.clave === clave);
    if (!escalera) {
      throw new ValidationError(
        `El área no tiene la escalera "${clave}": se declara en refs.yaml (escalera.${clave})`,
      );
    }
    return escalera;
  }

  ritual(clave: string): Ritual {
    const ritual = this.area.rituales.find((r) => r.clave === clave);
    if (!ritual) {
      throw new ValidationError(
        `Ritual desconocido: "${clave}". Los válidos: GET /area`,
      );
    }
    return ritual;
  }
}
