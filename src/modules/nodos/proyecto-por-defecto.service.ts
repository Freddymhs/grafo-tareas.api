import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  METODO_TRABAJO_HU,
  NOMBRE_PROYECTO_POR_DEFECTO,
} from '../../common/constants/index.js';
import {
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/index.js';
import { ENV_KEYS } from '../../config/env.constants.js';
import {
  ProyectoPorDefectoRepository,
  type BusquedaDeProyecto,
} from './proyecto-por-defecto.repository.js';

export interface ProyectoResuelto {
  readonly proyectoId: string;
  readonly porDefecto: boolean;
}

/** A qué proyecto va un nodo: al que pidió el cliente o, si no pidió ninguno, al de los adaptadores viejos (el SAG). */
@Injectable()
export class ProyectoPorDefectoService {
  constructor(
    private readonly config: ConfigService,
    @Inject(ProyectoPorDefectoRepository)
    private readonly repository: BusquedaDeProyecto,
  ) {}

  async resolver(proyectoId?: string): Promise<ProyectoResuelto> {
    if (proyectoId !== undefined) {
      const existe = await this.repository.existe(proyectoId);
      if (!existe) throw new NotFoundError('Proyecto');
      return { proyectoId, porDefecto: false };
    }
    const delEntorno = this.config.get<string>(ENV_KEYS.PROYECTO_POR_DEFECTO);
    if (delEntorno && (await this.repository.existe(delEntorno))) {
      return { proyectoId: delEntorno, porDefecto: true };
    }
    const delMetodo = await this.repository.delMetodo(
      NOMBRE_PROYECTO_POR_DEFECTO,
      METODO_TRABAJO_HU,
    );
    if (!delMetodo) {
      throw new ValidationError(
        'falta proyectoId y no hay proyecto por defecto',
      );
    }
    return { proyectoId: delMetodo.id, porDefecto: true };
  }
}
