import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

const SELECCION = {
  id: true,
  nombre: true,
  metodo: true,
  etapas: true,
} satisfies Prisma.EspacioSelect;

export type EspacioDelMetodo = Prisma.EspacioGetPayload<{
  select: typeof SELECCION;
}>;

@Injectable()
export class MetodoRepository {
  constructor(private readonly prisma: PrismaService) {}

  espacioPorId(id: string): Promise<EspacioDelMetodo | null> {
    return this.prisma.espacio.findUnique({ where: { id }, select: SELECCION });
  }

  async espacioDelProyecto(
    proyectoId: string,
  ): Promise<EspacioDelMetodo | null> {
    const proyecto = await this.prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { espacio: { select: SELECCION } },
    });
    return proyecto?.espacio ?? null;
  }
}
