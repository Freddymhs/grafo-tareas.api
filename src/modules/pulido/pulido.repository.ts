import { Injectable } from '@nestjs/common';
import { TipoCambio } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  conexionesDelArchivo,
  conexionesParaArchivo,
  nodoDelArchivo,
  nodoParaArchivo,
} from './archivo.js';

@Injectable()
export class PulidoRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Archiva el nodo con sus conexiones, lo anota en la bitácora y lo saca de `nodos` (sus conexiones caen en cascada),
   * todo o nada. `null` si el nodo no existe.
   */
  async descartar(nodoId: string, motivo: string) {
    return this.prisma.$transaction(async (tx) => {
      const nodo = await tx.nodo.findUnique({ where: { id: nodoId } });
      if (!nodo) return null;
      const conexiones = await tx.conexion.findMany({
        where: { OR: [{ origenId: nodoId }, { destinoId: nodoId }] },
        select: { origenId: true, destinoId: true, tipo: true },
      });
      const { externoOrigen, externoId, titulo } = nodo;
      const descarte = await tx.descarte.create({
        data: {
          nodoId,
          externoOrigen,
          externoId,
          titulo,
          motivo,
          nodo: nodoParaArchivo(nodo),
          conexiones: conexionesParaArchivo(conexiones),
        },
      });
      await tx.cambio.create({
        data: {
          nodoId,
          externoOrigen,
          externoId,
          titulo,
          tipo: TipoCambio.DESCARTE,
          motivo,
        },
      });
      await tx.nodo.delete({ where: { id: nodoId } });
      return { descarte, conexiones: conexiones.length };
    });
  }

  /**
   * Vuelve a crear el nodo con su mismo id y las conexiones cuyo otro extremo todavía existe. `null` si no estaba
   * descartado.
   */
  async restaurar(nodoId: string, motivo: string | null) {
    return this.prisma.$transaction(async (tx) => {
      const descarte = await tx.descarte.findUnique({ where: { nodoId } });
      if (!descarte) return null;
      const nodo = await tx.nodo.create({
        data: nodoDelArchivo(descarte.nodo),
      });
      const conexiones = conexionesDelArchivo(descarte.conexiones);
      const otros = conexiones.map(({ origenId, destinoId }) =>
        origenId === nodoId ? destinoId : origenId,
      );
      const existentes = new Set(
        (
          await tx.nodo.findMany({
            where: { id: { in: otros } },
            select: { id: true },
          })
        ).map(({ id }) => id),
      );
      const recuperables = conexiones.filter(({ origenId, destinoId }) =>
        existentes.has(origenId === nodoId ? destinoId : origenId),
      );
      await tx.conexion.createMany({
        data: recuperables,
        skipDuplicates: true,
      });
      await tx.cambio.create({
        data: {
          nodoId,
          externoOrigen: nodo.externoOrigen,
          externoId: nodo.externoId,
          titulo: nodo.titulo,
          tipo: TipoCambio.RESTAURACION,
          motivo,
        },
      });
      await tx.descarte.delete({ where: { nodoId } });
      return {
        nodo,
        conexionesRecuperadas: recuperables.length,
        conexionesPerdidas: conexiones.length - recuperables.length,
      };
    });
  }

  async descartes() {
    return this.prisma.descarte.findMany({
      select: {
        nodoId: true,
        externoOrigen: true,
        externoId: true,
        titulo: true,
        motivo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cambios() {
    return this.prisma.cambio.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
