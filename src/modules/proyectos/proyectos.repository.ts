import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

const SELECCION = {
  id: true,
  espacioId: true,
  nombre: true,
  color: true,
  orden: true,
  archivado: true,
} satisfies Prisma.ProyectoSelect;

@Injectable()
export class ProyectosRepository {
  constructor(private readonly prisma: PrismaService) {}

  existeEspacio(id: string) {
    return this.prisma.espacio.count({ where: { id } });
  }

  listarDeEspacio(espacioId: string, archivados: boolean) {
    return this.prisma.proyecto.findMany({
      where: archivados ? { espacioId } : { espacioId, archivado: false },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: SELECCION,
    });
  }

  findById(id: string) {
    return this.prisma.proyecto.findUnique({
      where: { id },
      select: SELECCION,
    });
  }

  findPorNombre(espacioId: string, nombre: string) {
    return this.prisma.proyecto.findUnique({
      where: { espacioId_nombre: { espacioId, nombre } },
      select: SELECCION,
    });
  }

  create(espacioId: string, nombre: string, color: string | undefined) {
    return this.prisma.proyecto.create({
      data: { espacioId, nombre, color },
      select: SELECCION,
    });
  }

  update(id: string, data: Prisma.ProyectoUpdateInput) {
    return this.prisma.proyecto.update({
      where: { id },
      data,
      select: SELECCION,
    });
  }

  contarNodos(proyectoId: string) {
    return this.prisma.nodo.count({ where: { proyectoId } });
  }

  remove(id: string) {
    return this.prisma.proyecto.delete({ where: { id }, select: SELECCION });
  }
}
