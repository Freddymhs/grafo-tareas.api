import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { NodoResumenDto } from '../nodos/dto/index.js';
import { DerivadoService } from './derivado.service.js';
import {
  BloqueadoResponseDto,
  DiaQueryDto,
  DiaResponseDto,
  FamiliaResponseDto,
  LiberaResponseDto,
  PaginaDto,
} from './dto/index.js';

/** Lo que se calcula sobre el grafo. Vive solo acá: la PWA y la VR lo muestran, no lo recalculan (C1). */
@ApiTags('Derivado')
@Controller()
export class DerivadoController {
  constructor(private readonly service: DerivadoService) {}

  @Get('derivado/hoy-puedo')
  @ApiOperation({ summary: 'Hoy puedo…: trabajo ABIERTO que nada bloquea' })
  @ApiResponse({ status: 200, type: [NodoResumenDto] })
  hoyPuedo() {
    return this.service.hoyPuedo();
  }

  @Get('derivado/dia')
  @ApiOperation({
    summary:
      'El parte del día: terminé, en curso (y si pasa del límite), detenido y para decir',
  })
  @ApiResponse({ status: 200, type: DiaResponseDto })
  dia(@Query() { desde }: DiaQueryDto) {
    return this.service.dia(desde);
  }

  @Get('derivado/paginas')
  @ApiOperation({
    summary:
      'Las páginas de la VR: una por HU (su árbol y lo que la bloquea) y «Sin HU» al final',
  })
  @ApiResponse({ status: 200, type: [PaginaDto] })
  paginas() {
    return this.service.paginas();
  }

  @Get('nodos/:id/familia')
  @ApiOperation({
    summary:
      'Lo que se ilumina al seleccionar un nodo en la VR: él, lo que cuelga de él y con qué se conecta directo',
  })
  @ApiResponse({ status: 200, type: FamiliaResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  familia(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.familia(id);
  }

  @Get('nodos/:id/bloqueado')
  @ApiOperation({ summary: '¿Está bloqueado? y qué lo bloquea' })
  @ApiResponse({ status: 200, type: BloqueadoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  bloqueado(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.bloqueado(id);
  }

  @Get('nodos/:id/libera')
  @ApiOperation({
    summary: 'Si este nodo se cierra (alguien contesta), qué se libera',
  })
  @ApiResponse({ status: 200, type: LiberaResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  libera(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.libera(id);
  }
}
