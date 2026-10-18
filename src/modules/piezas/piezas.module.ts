import { Module } from '@nestjs/common';
import { PiezasController } from './piezas.controller.js';
import { PiezasRepository } from './piezas.repository.js';
import { PiezasService } from './piezas.service.js';

@Module({
  controllers: [PiezasController],
  providers: [PiezasService, PiezasRepository],
})
export class PiezasModule {}
