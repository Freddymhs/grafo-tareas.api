import { Module } from '@nestjs/common';
import { AreaController } from './area.controller.js';
import { AreaService } from './area.service.js';

@Module({
  controllers: [AreaController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}
