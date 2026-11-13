import { RequiereMetodo } from '../../common/decorators/index.js';
import { METODO_TRABAJO_HU } from '../../common/constants/index.js';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { ComplementosService } from './complementos.service.js';
import {
  ComplementoResponseDto,
  CreateComplementoDto,
  DecidirDto,
  EscalarDto,
} from './dto/index.js';

@RequiereMetodo(METODO_TRABAJO_HU)
@ApiTags('Complementos')
@Controller('nodos')
export class ComplementosController {
  constructor(private readonly service: ComplementosService) {}

  @Get(':id/complementos')
  @ApiOperation({
    summary: 'Lo que cuelga de este nodo: dudas, decisiones, apuntes…',
  })
  @ApiResponse({ status: 200, type: [ComplementoResponseDto] })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  deUnNodo(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deUnNodo(id);
  }

  @Post(':id/complementos')
  @ApiOperation({
    summary:
      'Colgar un complemento del catálogo; una duda deja al nodo BLOQUEADA_POR ella',
  })
  @ApiResponse({ status: 201, type: ComplementoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  crear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateComplementoDto,
  ) {
    return this.service.crear(id, dto);
  }

  @Post(':id/escalar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Escalar una duda: pasa a esperar al siguiente de su escalera (refs.yaml), con rastro en la descripción',
  })
  @ApiResponse({ status: 200, type: ComplementoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  escalar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EscalarDto) {
    return this.service.escalar(id, dto);
  }

  @Post(':id/decidir')
  @ApiOperation({
    summary:
      'Cerrar una duda con su respuesta: queda cerrada y deja una decisión colgada de ella y de su PBI',
  })
  @ApiResponse({ status: 201, type: ComplementoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  decidir(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecidirDto) {
    return this.service.decidir(id, dto);
  }
}
