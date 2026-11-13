import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../common/exceptions/index.js';
import {
  CreateEspacioDto,
  ListarEspaciosDto,
  UpdateEspacioDto,
} from './dto/index.js';
import { EspaciosRepository } from './espacios.repository.js';

@Injectable()
export class EspaciosService {
  constructor(private readonly repository: EspaciosRepository) {}

  findAll({ archivados = false }: ListarEspaciosDto) {
    return this.repository.listar(archivados);
  }

  async create({ nombre, color, plantilla }: CreateEspacioDto) {
    await this.validarNombreLibre(nombre);
    return this.repository.crearConPlantilla(nombre, color, plantilla);
  }

  async update(id: string, dto: UpdateEspacioDto) {
    const actual = await this.buscar(id);
    if (dto.nombre !== undefined && dto.nombre !== actual.nombre) {
      await this.validarNombreLibre(dto.nombre);
    }
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.buscar(id);
    const nodos = await this.repository.contarNodos(id);
    if (nodos > 0) {
      throw new ConflictError(
        `El espacio tiene ${nodos} nodos: se archiva, no se borra`,
      );
    }
    return this.repository.remove(id);
  }

  private async buscar(id: string) {
    const espacio = await this.repository.findById(id);
    if (!espacio) throw new NotFoundError('Espacio');
    return espacio;
  }

  private async validarNombreLibre(nombre: string) {
    const existente = await this.repository.findByNombre(nombre);
    if (existente) {
      throw new ConflictError(`El espacio «${nombre}» ya existe`);
    }
  }
}
