import { Injectable } from '@nestjs/common';
import {
  Cara,
  EstadoNodo,
  Nodo,
  Prisma,
  TipoCambio,
  TipoConexion,
  TipoNodo,
} from '@prisma/client';
import { BaseRepository } from '../../database/base.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { Diferencia } from '../pulido/diferencias.js';
import type { FiltroRol } from '../roles/roles.service.js';
import { PosicionNodoDto } from './dto/index.js';
import { cambiosDelDia } from './orden-del-dia.js';

export interface FiltroNodos {
  readonly tipo?: TipoNodo;
  readonly estado?: EstadoNodo;
  readonly cara?: Cara;
  /** Solo estos ids (los de la página de una HU); undefined = todos. */
  readonly ids?: readonly string[];
  /** '' (vacía) = los que no tienen etapa; undefined = cualquiera. */
  readonly etapa?: string;
  readonly etiqueta?: string;
  readonly rama?: string;
  readonly q?: string;
  readonly rol?: FiltroRol;
  /** Etiquetas que excluyen al nodo (las notas, si el tablero las oculta). */
  readonly sinEtiquetas?: readonly string[];
}

/** Traduce el filtro del dominio al where de Prisma. */
function whereDe({
  tipo,
  estado,
  cara,
  ids,
  etapa,
  etiqueta,
  rama,
  q,
  rol,
  sinEtiquetas,
}: FiltroNodos): Prisma.NodoWhereInput {
  const porEtapa =
    etapa === undefined ? {} : { etapa: etapa === '' ? null : etapa };
  const porEtiqueta =
    etiqueta === undefined ? {} : { etiquetas: { has: etiqueta } };
  const porRama =
    rama === undefined
      ? {}
      : {
          salientes: {
            some: { tipo: TipoConexion.PERTENECE_A, destinoId: rama },
          },
        };
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
  // Etiqueta y rol filtran el mismo campo: van en AND para que uno no pise al otro.
  const porRol =
    rol === undefined
      ? []
      : [
          rol.tiene === undefined ? {} : { etiquetas: { has: rol.tiene } },
          rol.sinNinguna === undefined
            ? {}
            : { NOT: { etiquetas: { hasSome: [...rol.sinNinguna] } } },
        ];
  const sinExcluidas =
    sinEtiquetas === undefined || sinEtiquetas.length === 0
      ? {}
      : { NOT: { etiquetas: { hasSome: [...sinEtiquetas] } } };
  const porIds = ids === undefined ? {} : { id: { in: [...ids] } };
  return {
    tipo,
    estado,
    cara,
    ...porIds,
    ...porEtapa,
    ...porRama,
    ...porTexto,
    AND: [porEtiqueta, ...porRol, sinExcluidas],
  };
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

  /** Actualiza y anota en la bitácora (FASE 16) cada campo que cambió, con su motivo: todo o nada. */
  async actualizarConBitacora(
    nodo: Nodo,
    data: Prisma.NodoUpdateInput,
    cambios: readonly Diferencia[],
    motivo: string | null,
  ): Promise<Nodo> {
    const { id, externoOrigen, externoId, titulo } = nodo;
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.nodo.update({ where: { id }, data });
      if (cambios.length > 0) {
        await tx.cambio.createMany({
          data: cambios.map(({ campo, antes, despues }) => ({
            nodoId: id,
            externoOrigen,
            externoId,
            titulo,
            tipo: TipoCambio.EDICION,
            campo,
            antes,
            despues,
            motivo,
          })),
        });
      }
      return actualizado;
    });
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

  /** El tipo de cada id que existe (los que no, no vienen). */
  async tiposDe(ids: readonly string[]): Promise<TipoNodo[]> {
    const nodos = await this.prisma.nodo.findMany({
      where: { id: { in: [...ids] } },
      select: { tipo: true },
    });
    return nodos.map(({ tipo }) => tipo);
  }

  /**
   * Un solo commit: el día anterior se borra y el nuevo queda entero, o nada cambia. Mover una etiqueta no es trabajo:
   * se conserva `updatedAt`, o la tarjeta cerrada ayer saldría en «terminé» del parte de hoy (`GET /derivado/dia`).
   */
  async guardarOrdenDelDia(ids: readonly string[]): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const conEtiquetas = await tx.nodo.findMany({
        where: {
          OR: [
            { id: { in: [...ids] } },
            { NOT: { etiquetas: { isEmpty: true } } },
          ],
        },
        select: { id: true, etiquetas: true, updatedAt: true },
      });
      const fechaDe = new Map(
        conEtiquetas.map(({ id, updatedAt }) => [id, updatedAt]),
      );
      const cambios = cambiosDelDia(conEtiquetas, ids);
      await Promise.all(
        cambios.map(({ id, etiquetas }) =>
          tx.nodo.update({
            where: { id },
            data: { etiquetas: [...etiquetas], updatedAt: fechaDe.get(id) },
          }),
        ),
      );
      return ids.length;
    });
  }
}
