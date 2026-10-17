import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/index.js';
import { ConexionesRepository } from './conexiones.repository.js';
import { CreateConexionDto, ListarConexionesDto } from './dto/index.js';

@Injectable()
export class ConexionesService {
  constructor(private readonly repository: ConexionesRepository) {}

  async findAll({ nodoId, tipo }: ListarConexionesDto) {
    return this.repository.listar(nodoId, tipo);
  }

  async create(dto: CreateConexionDto) {
    const { origenId, destinoId, tipo } = dto;
    if (origenId === destinoId) {
      throw new ValidationError('Un nodo no se conecta consigo mismo');
    }
    const existentes = await this.repository.contarNodos([origenId, destinoId]);
    const ambosExisten = existentes === 2;
    if (!ambosExisten) {
      throw new NotFoundError('Nodo');
    }
    const repetida = await this.repository.buscarIgual(dto);
    if (repetida) {
      throw new ConflictError(`La conexión ${tipo} ya existe (${repetida.id})`);
    }
    return this.repository.create(dto);
  }

  async remove(id: string) {
    const conexion = await this.repository.findById(id);
    if (!conexion) {
      throw new NotFoundError('Conexión');
    }
    return this.repository.remove(id);
  }
}
