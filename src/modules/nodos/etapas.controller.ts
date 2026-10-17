import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EtapasService } from './etapas.service.js';

@ApiTags('Etapas')
@Controller('etapas')
export class EtapasController {
  constructor(private readonly service: EtapasService) {}

  @Get()
  @ApiOperation({ summary: 'Las columnas del tablero, en orden' })
  @ApiResponse({ status: 200, type: [String] })
  lista(): readonly string[] {
    return this.service.lista();
  }
}
