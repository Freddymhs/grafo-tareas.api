import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../common/exceptions/index.js';
import { ListarEspaciosDto } from '../espacios/dto/index.js';
import { CreateProyectoDto, UpdateProyectoDto } from './dto/index.js';
import { ProyectosRepository } from './proyectos.repository.js';

@Injectable()
export class ProyectosService {
  constructor(private readonly repository: ProyectosRepository) {}

  async listarDeEspacio(
    espacioId: string,
    { archivados = false }: ListarEspaciosDto,
  ) {
    await this.validarEspacio(espacioId);
    return this.repository.listarDeEspacio(espacioId, archivados);
  }

  async create(espacioId: string, { nombre, color }: CreateProyectoDto) {
    await this.validarEspacio(espacioId);
    await this.validarNombreLibre(espacioId, nombre);
    return this.repository.create(espacioId, nombre, color);
  }

  async update(id: string, dto: UpdateProyectoDto) {
    const actual = await this.buscar(id);
    if (dto.nombre !== undefined && dto.nombre !== actual.nombre) {
      await this.validarNombreLibre(actual.espacioId, dto.nombre);
    }
    return this.repository.update(id, dto);
  }

  async remove(id: string) {
    await this.buscar(id);
    const nodos = await this.repository.contarNodos(id);
    if (nodos > 0) {
      throw new ConflictError(
        `El proyecto tiene ${nodos} nodos: se archiva, no se borra`,
      );
    }
    return this.repository.remove(id);
  }

  private async buscar(id: string) {
    const proyecto = await this.repository.findById(id);
    if (!proyecto) throw new NotFoundError('Proyecto');
    return proyecto;
  }

  private async validarEspacio(espacioId: string) {
    const existe = (await this.repository.existeEspacio(espacioId)) > 0;
    if (!existe) throw new NotFoundError('Espacio');
  }

  private async validarNombreLibre(espacioId: string, nombre: string) {
    const existente = await this.repository.findPorNombre(espacioId, nombre);
    if (existente) {
      throw new ConflictError(
        `El proyecto «${nombre}» ya existe en el espacio`,
      );
    }
  }
}
