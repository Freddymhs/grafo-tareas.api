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
import {
  CambioResponseDto,
  DescartadoResponseDto,
  DescartarDto,
  DescarteResponseDto,
  RestauradoResponseDto,
  RestaurarDto,
} from './dto/index.js';
import { PulidoService } from './pulido.service.js';

/** Pulir el grafo sin tocar Todoist (FASE 16): descartar en vez de borrar, y la bitácora de cada cambio. */
@ApiTags('Pulido')
@Controller()
export class PulidoController {
  constructor(private readonly service: PulidoService) {}

  @Post('nodos/:id/descartar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Descartar un nodo: se archiva entero con sus conexiones (se puede deshacer) y la importación no lo revive',
  })
  @ApiResponse({ status: 201, type: DescartadoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  descartar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() { motivo }: DescartarDto,
  ) {
    return this.service.descartar(id, motivo);
  }

  @Post('descartes/:nodoId/restaurar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Deshacer un descarte: el nodo vuelve con su id y sus conexiones',
  })
  @ApiResponse({ status: 201, type: RestauradoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  restaurar(
    @Param('nodoId', ParseUUIDPipe) nodoId: string,
    @Body() { motivo }: RestaurarDto,
  ) {
    return this.service.restaurar(nodoId, motivo ?? null);
  }

  @Get('descartes')
  @ApiOperation({ summary: 'Lo descartado al pulir, lo más reciente primero' })
  @ApiResponse({ status: 200, type: [DescarteResponseDto] })
  descartes() {
    return this.service.descartes();
  }

  @Get('cambios')
  @ApiOperation({
    summary:
      'La bitácora del pulido: cada edición, descarte y restauración, con su motivo',
  })
  @ApiResponse({ status: 200, type: [CambioResponseDto] })
  cambios() {
    return this.service.cambios();
  }
}
