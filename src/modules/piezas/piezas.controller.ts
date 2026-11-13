import { RequiereMetodo } from '../../common/decorators/index.js';
import { METODO_TRABAJO_HU } from '../../common/constants/index.js';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { NodoResponseDto } from '../nodos/dto/index.js';
import { CreatePiezaDto } from './dto/index.js';
import { PiezasService } from './piezas.service.js';

@RequiereMetodo(METODO_TRABAJO_HU)
@ApiTags('Piezas')
@Controller('piezas')
export class PiezasController {
  constructor(private readonly service: PiezasService) {}

  @Post()
  @ApiOperation({
    summary:
      'Una pieza del reparto en el plan de su HU (cara PLAN), colgada de su HU y de su carril',
  })
  @ApiResponse({ status: 201, type: NodoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  crear(@Body() dto: CreatePiezaDto) {
    return this.service.crear(dto);
  }
}
