import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

const SELECCION_NODO = {
  id: true,
  espacioId: true,
  nombre: true,
  color: true,
  forma: true,
  tieneCiclo: true,
  accionable: true,
} satisfies Prisma.TipoNodoSelect;

const SELECCION_CONEXION = {
  id: true,
  nombre: true,
  bloquea: true,
  contiene: true,
  simetrica: true,
} satisfies Prisma.TipoConexionSelect;

@Injectable()
export class TiposRepository {
  constructor(private readonly prisma: PrismaService) {}

  existeEspacio(id: string) {
    return this.prisma.espacio.count({ where: { id } });
  }

  listarNodo(espacioId: string) {
    return this.prisma.tipoNodo.findMany({
      where: { espacioId },
      orderBy: { nombre: 'asc' },
      select: SELECCION_NODO,
    });
  }

  findNodoPorId(id: string) {
    return this.prisma.tipoNodo.findUnique({
      where: { id },
      select: SELECCION_NODO,
    });
  }

  findNodoPorNombre(espacioId: string, nombre: string) {
    return this.prisma.tipoNodo.findUnique({
      where: { espacioId_nombre: { espacioId, nombre } },
      select: SELECCION_NODO,
    });
  }

  crearNodo(data: Prisma.TipoNodoUncheckedCreateInput) {
    return this.prisma.tipoNodo.create({ data, select: SELECCION_NODO });
  }

  actualizarNodo(id: string, data: Prisma.TipoNodoUpdateInput) {
    return this.prisma.tipoNodo.update({
      where: { id },
      data,
      select: SELECCION_NODO,
    });
  }

  async nombresDeConexion(
    propiedad: 'bloquea' | 'contiene',
  ): Promise<string[]> {
    const tipos = await this.prisma.tipoConexion.findMany({
      where: { [propiedad]: true },
      select: { nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return tipos.map(({ nombre }) => nombre);
  }

  accionables() {
    return this.prisma.tipoNodo.findMany({
      where: { accionable: true },
      select: { espacioId: true, nombre: true },
    });
  }

  listarConexion() {
    return this.prisma.tipoConexion.findMany({
      orderBy: { nombre: 'asc' },
      select: SELECCION_CONEXION,
    });
  }

  findConexionPorNombre(nombre: string) {
    return this.prisma.tipoConexion.findUnique({
      where: { nombre },
      select: SELECCION_CONEXION,
    });
  }

  crearConexion(data: Prisma.TipoConexionCreateInput) {
    return this.prisma.tipoConexion.create({
      data,
      select: SELECCION_CONEXION,
    });
  }
}
