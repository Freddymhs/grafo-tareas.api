import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NOMBRE_PROYECTO_GENERAL } from '../../common/constants/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PLANTILLAS, type NombrePlantilla } from './plantillas.js';

const SELECCION = {
  id: true,
  nombre: true,
  color: true,
  orden: true,
  archivado: true,
  metodo: true,
  etapas: true,
} satisfies Prisma.EspacioSelect;

@Injectable()
export class EspaciosRepository {
  constructor(private readonly prisma: PrismaService) {}

  listar(archivados: boolean) {
    return this.prisma.espacio.findMany({
      where: archivados ? {} : { archivado: false },
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: SELECCION,
    });
  }

  findById(id: string) {
    return this.prisma.espacio.findUnique({ where: { id }, select: SELECCION });
  }

  findByNombre(nombre: string) {
    return this.prisma.espacio.findUnique({
      where: { nombre },
      select: SELECCION,
    });
  }

  crearConPlantilla(
    nombre: string,
    color: string | undefined,
    plantilla: NombrePlantilla,
  ) {
    const { tiposNodo, etapas } = PLANTILLAS[plantilla];
    return this.prisma.espacio.create({
      data: {
        nombre,
        color,
        etapas: [...etapas],
        proyectos: { create: { nombre: NOMBRE_PROYECTO_GENERAL } },
        tiposNodo: { create: tiposNodo.map((tipo) => ({ ...tipo })) },
      },
      select: SELECCION,
    });
  }

  update(id: string, data: Prisma.EspacioUpdateInput) {
    return this.prisma.espacio.update({
      where: { id },
      data,
      select: SELECCION,
    });
  }

  contarNodos(espacioId: string) {
    return this.prisma.nodo.count({ where: { proyecto: { espacioId } } });
  }

  async remove(id: string) {
    const [, borrado] = await this.prisma.$transaction([
      this.prisma.proyecto.deleteMany({ where: { espacioId: id } }),
      this.prisma.espacio.delete({ where: { id }, select: SELECCION }),
    ]);
    return borrado;
  }
}
