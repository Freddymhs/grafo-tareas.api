import { Injectable } from '@nestjs/common';
import { TiposRepository } from './tipos.repository.js';

export interface TipoAccionable {
  readonly espacioId: string;
  readonly nombre: string;
}

/** Lo que los tipos dicen de sí mismos: qué conexiones bloquean, cuáles agrupan y qué nodos se pueden hacer hoy. */
@Injectable()
export class TiposPropiedadesService {
  constructor(private readonly repository: TiposRepository) {}

  bloqueantes(): Promise<readonly string[]> {
    return this.repository.nombresDeConexion('bloquea');
  }

  contenedoras(): Promise<readonly string[]> {
    return this.repository.nombresDeConexion('contiene');
  }

  accionables(): Promise<readonly TipoAccionable[]> {
    return this.repository.accionables();
  }
}
