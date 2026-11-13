import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

/** Lo que el servicio le pide: el contrato que un doble de prueba puede cumplir sin la clase. */
export interface BusquedaDeProyecto {
  existe(id: string): Promise<boolean>;
  delMetodo(nombre: string, metodo: string): Promise<{ id: string } | null>;
}

@Injectable()
export class ProyectoPorDefectoRepository implements BusquedaDeProyecto {
  constructor(private readonly prisma: PrismaService) {}

  async existe(id: string): Promise<boolean> {
    const cuenta = await this.prisma.proyecto.count({ where: { id } });
    return cuenta > 0;
  }

  /** El proyecto con ese nombre dentro del espacio que enciende ese método de trabajo. */
  delMetodo(nombre: string, metodo: string): Promise<{ id: string } | null> {
    return this.prisma.proyecto.findFirst({
      where: { nombre, espacio: { metodo } },
      select: { id: true },
    });
  }
}
