import { Module } from '@nestjs/common';
import { NodosController } from './nodos.controller.js';
import { NodosRepository } from './nodos.repository.js';
import { NodosService } from './nodos.service.js';

@Module({
  controllers: [NodosController],
  providers: [NodosService, NodosRepository],
  exports: [NodosService],
})
export class NodosModule {}
