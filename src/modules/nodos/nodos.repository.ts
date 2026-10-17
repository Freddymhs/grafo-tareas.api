import { Injectable } from '@nestjs/common';
import { EstadoNodo, Nodo, Prisma, TipoNodo } from '@prisma/client';
import { BaseRepository } from '../../database/base.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PosicionNodoDto } from './dto/index.js';

export interface FiltroNodos {
  readonly tipo?: TipoNodo;
  readonly estado?: EstadoNodo;
  /** '' (vacía) = los que no tienen etapa; undefined = cualquiera. */
  readonly etapa?: string;
  readonly etiqueta?: string;
  readonly q?: string;
}

/** Traduce el filtro del dominio al where de Prisma. */
function whereDe({
  tipo,
  estado,
  etapa,
  etiqueta,
  q,
}: FiltroNodos): Prisma.NodoWhereInput {
  const porEtapa =
    etapa === undefined ? {} : { etapa: etapa === '' ? null : etapa };
  const porEtiqueta =
    etiqueta === undefined ? {} : { etiquetas: { has: etiqueta } };
  const porTexto =
    q === undefined
      ? {}
      : {
          OR: [
            { titulo: { contains: q, mode: Prisma.QueryMode.insensitive } },
            {
              descripcion: { contains: q, mode: Prisma.QueryMode.insensitive },
            },
          ],
        };
  return { tipo, estado, ...porEtapa, ...porEtiqueta, ...porTexto };
}

@Injectable()
export class NodosRepository extends BaseRepository<
  Nodo,
  Prisma.NodoCreateInput,
  Prisma.NodoUpdateInput
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get delegate() {
    return this.prisma.nodo;
  }

  async listar(
    filtro: FiltroNodos,
    skip: number,
    take: number,
  ): Promise<Nodo[]> {
    return this.prisma.nodo.findMany({
      where: whereDe(filtro),
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });
  }

  async contar(filtro: FiltroNodos): Promise<number> {
    return this.prisma.nodo.count({ where: whereDe(filtro) });
  }

  async contarExistentes(ids: readonly string[]): Promise<number> {
    return this.prisma.nodo.count({ where: { id: { in: [...ids] } } });
  }

  async buscarPorExterno(
    externoOrigen: string,
    externoId: string,
  ): Promise<Nodo | null> {
    return this.prisma.nodo.findUnique({
      where: { externoOrigen_externoId: { externoOrigen, externoId } },
    });
  }

  /** Un solo commit: el mapa queda entero o no cambia. */
  async guardarPosiciones(
    posiciones: readonly PosicionNodoDto[],
  ): Promise<number> {
    const actualizaciones = posiciones.map(({ id, x, y, z }) =>
      this.prisma.nodo.update({
        where: { id },
        data: { posX: x, posY: y, posZ: z },
      }),
    );
    const resultado = await this.prisma.$transaction(actualizaciones);
    return resultado.length;
  }
}
