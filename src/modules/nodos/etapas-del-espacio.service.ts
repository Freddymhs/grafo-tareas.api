import { Injectable } from '@nestjs/common';
import { METODO_TRABAJO_HU } from '../../common/constants/index.js';
import { ValidationError } from '../../common/exceptions/index.js';
import { MetodoService } from '../metodo/metodo.service.js';
import { EtapasService } from './etapas.service.js';

/**
 * Las columnas de un espacio: con el método de trabajo, las del tablero y los roles (`EtapasService`); sin él, las suyas
 * en la base. Sin espacio pedido, las del método: lo de siempre.
 */
@Injectable()
export class EtapasDelEspacioService {
  constructor(
    private readonly etapas: EtapasService,
    private readonly metodos: MetodoService,
  ) {}

  async lista(espacioId?: string): Promise<readonly string[]> {
    if (espacioId === undefined) return this.etapas.lista();
    const espacio = await this.metodos.espacioDe(espacioId);
    return espacio.metodo === METODO_TRABAJO_HU
      ? this.etapas.lista()
      : espacio.etapas;
  }

  async validar(
    etapa: string | undefined | null,
    espacioId?: string,
  ): Promise<void> {
    if (etapa === undefined || etapa === null) return;
    const vale = (await this.lista(espacioId)).includes(etapa);
    if (!vale) {
      throw new ValidationError(
        `Etapa desconocida: "${etapa}". Las válidas: GET /etapas`,
      );
    }
  }
}
