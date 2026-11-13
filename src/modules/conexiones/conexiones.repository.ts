import { Injectable } from '@nestjs/common';
import { Conexion } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateConexionDto } from './dto/index.js';

@Injectable()
export class ConexionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(nodoId?: string, tipo?: string): Promise<Conexion[]> {
    const deEseNodo = nodoId
      ? { OR: [{ origenId: nodoId }, { destinoId: nodoId }] }
      : {};
    return this.prisma.conexion.findMany({
      where: { ...deEseNodo, tipo },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string): Promise<Conexion | null> {
    return this.prisma.conexion.findUnique({ where: { id } });
  }

  async buscarIgual({
    origenId,
    destinoId,
    tipo,
  }: CreateConexionDto): Promise<Conexion | null> {
    return this.prisma.conexion.findUnique({
      where: { origenId_destinoId_tipo: { origenId, destinoId, tipo } },
    });
  }

  async existeTipo(nombre: string): Promise<boolean> {
    const cuenta = await this.prisma.tipoConexion.count({ where: { nombre } });
    return cuenta > 0;
  }

  async contarNodos(ids: readonly string[]): Promise<number> {
    return this.prisma.nodo.count({ where: { id: { in: [...ids] } } });
  }

  async create(dto: CreateConexionDto): Promise<Conexion> {
    return this.prisma.conexion.create({ data: dto });
  }

  async remove(id: string): Promise<Conexion> {
    return this.prisma.conexion.delete({ where: { id } });
  }
}
