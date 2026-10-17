import { Injectable } from '@nestjs/common';
import { TipoNodo } from '@prisma/client';
import { NodosService } from '../nodos/nodos.service.js';
import { CreateRamaDto } from './dto/index.js';
import { RamasRepository } from './ramas.repository.js';

@Injectable()
export class RamasService {
  constructor(
    private readonly repository: RamasRepository,
    private readonly nodos: NodosService,
  ) {}

  async findAll() {
    return this.repository.listarConMiembros();
  }

  async create(dto: CreateRamaDto) {
    return this.nodos.create({ ...dto, tipo: TipoNodo.RAMA });
  }
}
