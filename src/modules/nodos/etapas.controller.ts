import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EtapasQueryDto } from './dto/index.js';
import { EtapasDelEspacioService } from './etapas-del-espacio.service.js';

@ApiTags('Etapas')
@Controller('etapas')
export class EtapasController {
  constructor(private readonly service: EtapasDelEspacioService) {}

  @Get()
  @ApiOperation({
    summary:
      'Las columnas del tablero, en orden (?espacio=: las de ese espacio; sin él, las del método de trabajo)',
  })
  @ApiResponse({ status: 200, type: [String] })
  lista(@Query() { espacio }: EtapasQueryDto): Promise<readonly string[]> {
    return this.service.lista(espacio);
  }
}
