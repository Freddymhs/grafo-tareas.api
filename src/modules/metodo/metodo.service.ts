import { Injectable } from '@nestjs/common';
import { DomainError, NotFoundError } from '../../common/exceptions/index.js';
import { ProyectoPorDefectoService } from '../nodos/proyecto-por-defecto.service.js';
import {
  MetodoRepository,
  type EspacioDelMetodo,
} from './metodo.repository.js';

const HTTP_NO_ENCONTRADO = 404;

/** Qué espacio responde una consulta del método de trabajo: el pedido o, sin pedido, el del proyecto por defecto. */
@Injectable()
export class MetodoService {
  constructor(
    private readonly repository: MetodoRepository,
    private readonly proyectoPorDefecto: ProyectoPorDefectoService,
  ) {}

  async espacioDe(espacioId?: string): Promise<EspacioDelMetodo> {
    if (espacioId !== undefined) {
      const pedido = await this.repository.espacioPorId(espacioId);
      if (!pedido) throw new NotFoundError('Espacio');
      return pedido;
    }
    const { proyectoId } = await this.proyectoPorDefecto.resolver();
    const delProyecto = await this.repository.espacioDelProyecto(proyectoId);
    if (!delProyecto) throw new NotFoundError('Espacio');
    return delProyecto;
  }

  async exigir(metodo: string, espacioId?: string): Promise<void> {
    this.verificar(metodo, await this.espacioDe(espacioId));
  }

  /** El espacio de ese proyecto (el de un nodo concreto, no el pedido ni el por defecto) tiene que usar el método. */
  async exigirDelProyecto(metodo: string, proyectoId: string): Promise<void> {
    const espacio = await this.repository.espacioDelProyecto(proyectoId);
    if (!espacio) throw new NotFoundError('Espacio');
    this.verificar(metodo, espacio);
  }

  private verificar(metodo: string, espacio: EspacioDelMetodo): void {
    if (espacio.metodo === metodo) return;
    throw new DomainError(
      'NOT_FOUND',
      `el espacio «${espacio.nombre}» no usa el método de trabajo`,
      HTTP_NO_ENCONTRADO,
    );
  }
}
