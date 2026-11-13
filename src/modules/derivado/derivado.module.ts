import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module.js';
import { TiposModule } from '../tipos/tipos.module.js';
import { DerivadoController } from './derivado.controller.js';
import { DerivadoRepository } from './derivado.repository.js';
import { DerivadoService } from './derivado.service.js';

@Module({
  imports: [RolesModule, TiposModule],
  controllers: [DerivadoController],
  providers: [DerivadoService, DerivadoRepository],
  exports: [DerivadoService],
})
export class DerivadoModule {}
