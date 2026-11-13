import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { MetodoService } from '../../modules/metodo/metodo.service.js';
import { METADATA_REQUIERE_METODO } from '../decorators/requiere-metodo.metadata.js';

@Injectable()
export class RequiereMetodoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly metodos: MetodoService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const metodo = this.reflector.getAllAndOverride<string | undefined>(
      METADATA_REQUIERE_METODO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (metodo === undefined) return true;
    const { query } = contexto.switchToHttp().getRequest<FastifyRequest>();
    const { espacio } = query as { espacio?: string };
    await this.metodos.exigir(metodo, espacio);
    return true;
  }
}
