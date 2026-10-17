import { Module } from '@nestjs/common';
import { ConexionesController } from './conexiones.controller.js';
import { ConexionesRepository } from './conexiones.repository.js';
import { ConexionesService } from './conexiones.service.js';

@Module({
  controllers: [ConexionesController],
  providers: [ConexionesService, ConexionesRepository],
})
export class ConexionesModule {}
