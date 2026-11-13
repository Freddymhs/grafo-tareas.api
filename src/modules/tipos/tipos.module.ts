import { Module } from '@nestjs/common';
import { TiposController } from './tipos.controller.js';
import { TiposRepository } from './tipos.repository.js';
import { TiposPropiedadesService } from './tipos-propiedades.service.js';
import { TiposService } from './tipos.service.js';

@Module({
  controllers: [TiposController],
  providers: [TiposService, TiposRepository, TiposPropiedadesService],
  exports: [TiposPropiedadesService],
})
export class TiposModule {}
