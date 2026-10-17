import { Injectable } from '@nestjs/common';
import { TipoConexion, TipoNodo } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { RamaResponseDto } from './dto/index.js';

@Injectable()
export class RamasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarConMiembros(): Promise<RamaResponseDto[]> {
    const ramas = await this.prisma.nodo.findMany({
      where: { tipo: TipoNodo.RAMA },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        titulo: true,
        color: true,
        estado: true,
        _count: {
          select: { entrantes: { where: { tipo: TipoConexion.PERTENECE_A } } },
        },
      },
    });
    return ramas.map(({ _count, ...rama }) => ({
      ...rama,
      miembros: _count.entrantes,
    }));
  }
}
