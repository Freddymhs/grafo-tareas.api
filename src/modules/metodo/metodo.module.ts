import { Global, Module } from '@nestjs/common';
import { ProyectoPorDefectoRepository } from '../nodos/proyecto-por-defecto.repository.js';
import { ProyectoPorDefectoService } from '../nodos/proyecto-por-defecto.service.js';
import { MetodoRepository } from './metodo.repository.js';
import { MetodoService } from './metodo.service.js';

/** Global: lo usan el guard de la capa del método, las etapas y los nodos, desde módulos que no se importan entre sí. */
@Global()
@Module({
  providers: [
    MetodoRepository,
    MetodoService,
    ProyectoPorDefectoRepository,
    ProyectoPorDefectoService,
  ],
  exports: [MetodoService, ProyectoPorDefectoService],
})
export class MetodoModule {}
