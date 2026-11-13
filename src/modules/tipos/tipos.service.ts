import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../common/exceptions/index.js';
import {
  CreateTipoConexionDto,
  CreateTipoNodoDto,
  UpdateTipoNodoDto,
} from './dto/index.js';
import { TiposRepository } from './tipos.repository.js';

@Injectable()
export class TiposService {
  constructor(private readonly repository: TiposRepository) {}

  async listarNodo(espacioId: string) {
    await this.validarEspacio(espacioId);
    return this.repository.listarNodo(espacioId);
  }

  async crearNodo(espacioId: string, dto: CreateTipoNodoDto) {
    await this.validarEspacio(espacioId);
    const existente = await this.repository.findNodoPorNombre(
      espacioId,
      dto.nombre,
    );
    if (existente) {
      throw new ConflictError(
        `El tipo «${dto.nombre}» ya existe en el espacio`,
      );
    }
    return this.repository.crearNodo({ espacioId, ...dto });
  }

  async actualizarNodo(id: string, dto: UpdateTipoNodoDto) {
    const tipo = await this.repository.findNodoPorId(id);
    if (!tipo) throw new NotFoundError('Tipo de nodo');
    return this.repository.actualizarNodo(id, dto);
  }

  listarConexion() {
    return this.repository.listarConexion();
  }

  async crearConexion(dto: CreateTipoConexionDto) {
    const existente = await this.repository.findConexionPorNombre(dto.nombre);
    if (existente) {
      throw new ConflictError(`El tipo de conexión «${dto.nombre}» ya existe`);
    }
    return this.repository.crearConexion(dto);
  }

  private async validarEspacio(espacioId: string) {
    const existe = (await this.repository.existeEspacio(espacioId)) > 0;
    if (!existe) throw new NotFoundError('Espacio');
  }
}
