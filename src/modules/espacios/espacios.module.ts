import { Module } from '@nestjs/common';
import { EspaciosController } from './espacios.controller.js';
import { EspaciosRepository } from './espacios.repository.js';
import { EspaciosService } from './espacios.service.js';

@Module({
  controllers: [EspaciosController],
  providers: [EspaciosService, EspaciosRepository],
})
export class EspaciosModule {}
