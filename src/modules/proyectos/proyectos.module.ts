import { Module } from '@nestjs/common';
import { ProyectosController } from './proyectos.controller.js';
import { ProyectosRepository } from './proyectos.repository.js';
import { ProyectosService } from './proyectos.service.js';

@Module({
  controllers: [ProyectosController],
  providers: [ProyectosService, ProyectosRepository],
})
export class ProyectosModule {}
