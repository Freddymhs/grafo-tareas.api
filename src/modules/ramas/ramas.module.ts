import { Module } from '@nestjs/common';
import { NodosModule } from '../nodos/nodos.module.js';
import { RamasController } from './ramas.controller.js';
import { RamasRepository } from './ramas.repository.js';
import { RamasService } from './ramas.service.js';

@Module({
  imports: [NodosModule],
  controllers: [RamasController],
  providers: [RamasService, RamasRepository],
})
export class RamasModule {}
