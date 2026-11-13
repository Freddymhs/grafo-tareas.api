import {
  TIPO_NODO,
  TIPO_CONEXION,
} from '../../common/constants/tipos.constants.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { RamaResponseDto } from './dto/index.js';

@Injectable()
export class RamasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarConMiembros(): Promise<RamaResponseDto[]> {
    const ramas = await this.prisma.nodo.findMany({
      where: { tipo: TIPO_NODO.RAMA },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        titulo: true,
        color: true,
        estado: true,
        _count: {
          select: { entrantes: { where: { tipo: TIPO_CONEXION.PERTENECE_A } } },
        },
      },
    });
    return ramas.map(({ _count, ...rama }) => ({
      ...rama,
      miembros: _count.entrantes,
    }));
  }
}
