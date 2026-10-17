import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ETAPAS_POR_DEFECTO } from '../../common/constants/index.js';
import { ValidationError } from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';
import { RolesService } from '../roles/roles.service.js';

const SEPARADOR = ',';

/**
 * Las columnas del tablero, en orden: la lista del tablero (C9, configurable por `ETAPAS`) y después las columnas
 * de los roles que no estén (C11). No es solo la unión de los roles: las tarjetas importadas usan columnas que ningún
 * rol tiene (`❓ DUDAS EN ESPERA`, `🔎 Precheck…`, medido 2026-10-17).
 */
@Injectable()
export class EtapasService {
  constructor(
    private readonly config: ConfigService,
    private readonly roles: RolesService,
  ) {}

  lista(): readonly string[] {
    return [...new Set([...this.delTablero(), ...this.roles.columnas()])];
  }

  private delTablero(): readonly string[] {
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
