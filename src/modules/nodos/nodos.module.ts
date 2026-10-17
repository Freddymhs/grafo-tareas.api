import { Module } from '@nestjs/common';
import { EtapasController } from './etapas.controller.js';
import { EtapasService } from './etapas.service.js';
import { NodosController } from './nodos.controller.js';
import { NodosRepository } from './nodos.repository.js';
import { NodosService } from './nodos.service.js';

@Module({
  controllers: [NodosController, EtapasController],
  providers: [NodosService, NodosRepository, EtapasService],
  exports: [NodosService, EtapasService],
})
export class NodosModule {}
