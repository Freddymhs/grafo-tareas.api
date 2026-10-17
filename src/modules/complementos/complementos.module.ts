import { Module } from '@nestjs/common';
import { AreaModule } from '../area/area.module.js';
import { RolesModule } from '../roles/roles.module.js';
import { ComplementosController } from './complementos.controller.js';
import { ComplementosRepository } from './complementos.repository.js';
import { ComplementosService } from './complementos.service.js';

@Module({
  imports: [RolesModule, AreaModule],
  controllers: [ComplementosController],
  providers: [ComplementosService, ComplementosRepository],
})
export class ComplementosModule {}
