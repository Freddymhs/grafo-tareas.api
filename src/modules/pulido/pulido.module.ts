import { Module } from '@nestjs/common';
import { PulidoController } from './pulido.controller.js';
import { PulidoRepository } from './pulido.repository.js';
import { PulidoService } from './pulido.service.js';

@Module({
  controllers: [PulidoController],
  providers: [PulidoService, PulidoRepository],
})
export class PulidoModule {}
