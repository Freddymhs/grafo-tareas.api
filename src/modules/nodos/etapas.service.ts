import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ETAPAS_POR_DEFECTO } from '../../common/constants/index.js';
import { ValidationError } from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';

const SEPARADOR = ',';

/** Las columnas del tablero, en orden (C9): la lista del método, configurable por `ETAPAS`. */
@Injectable()
export class EtapasService {
  constructor(private readonly config: ConfigService) {}

  lista(): readonly string[] {
    const delEntorno = this.config.get<string>(ENV_KEYS.ETAPAS);
    if (!delEntorno) return ETAPAS_POR_DEFECTO;
    return delEntorno
      .split(SEPARADOR)
      .map((etapa) => etapa.trim())
      .filter((etapa) => etapa.length > 0);
  }

  validar(etapa: string | undefined | null): void {
    const vale =
      etapa === undefined || etapa === null || this.lista().includes(etapa);
    if (!vale) {
      throw new ValidationError(
        `Etapa desconocida: "${etapa}". Las válidas: GET /etapas`,
      );
    }
  }
}
