import { Module } from '@nestjs/common';
import { DerivadoController } from './derivado.controller.js';
import { DerivadoRepository } from './derivado.repository.js';
import { DerivadoService } from './derivado.service.js';

@Module({
  controllers: [DerivadoController],
  providers: [DerivadoService, DerivadoRepository],
})
export class DerivadoModule {}
