import { RequiereMetodo } from '../../common/decorators/index.js';
import { METODO_TRABAJO_HU } from '../../common/constants/index.js';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { NodoResponseDto, NodoResumenDto } from '../nodos/dto/index.js';
import { DerivadoService } from './derivado.service.js';
import {
  BloqueadoResponseDto,
  DiaQueryDto,
  DiaResponseDto,
  EspacioQueryDto,
  FamiliaResponseDto,
  HoyPuedoQueryDto,
  LiberaResponseDto,
  CarrilDto,
  PaginaDto,
  PlanQueryDto,
  UltimoCambioQueryDto,
  UltimoCambioResponseDto,
} from './dto/index.js';

/** Lo que se calcula sobre el grafo. Vive solo acá: la PWA y la VR lo muestran, no lo recalculan (C1). */
@ApiTags('Derivado')
@Controller()
export class DerivadoController {
  constructor(private readonly service: DerivadoService) {}

  @Get('derivado/hoy-puedo')
  @ApiOperation({
    summary:
      'Hoy puedo…: trabajo ABIERTO que nada bloquea, sin lo archivado (?proyecto= / ?espacio=)',
  })
  @ApiResponse({ status: 200, type: [NodoResumenDto] })
  hoyPuedo(@Query() { proyecto, espacio }: HoyPuedoQueryDto) {
    return this.service.hoyPuedo({ proyectoId: proyecto, espacioId: espacio });
  }

  @Get('proyectos/:id/vecinos')
  @ApiOperation({
    summary:
      'Los nodos de otros proyectos conectados con algo de éste (los «fantasmas» de la vista de un proyecto)',
  })
  @ApiResponse({ status: 200, type: [NodoResponseDto] })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  vecinos(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.vecinos(id);
  }

  @Get('derivado/dia')
  @RequiereMetodo(METODO_TRABAJO_HU)
  @ApiOperation({
    summary:
      'El parte del día: terminé, en curso (y si pasa del límite), detenido y para decir',
  })
  @ApiResponse({ status: 200, type: DiaResponseDto })
  dia(@Query() { desde, espacio }: DiaQueryDto) {
    return this.service.dia(desde, espacio);
  }

  @Get('derivado/ultimo-cambio')
  @ApiOperation({
    summary:
      'Lo último que cambió en una página: qué nodo, cuándo y qué pasó («pasó a Trabajo»)',
  })
  @ApiResponse({ status: 200, type: UltimoCambioResponseDto })
  ultimoCambio(@Query() { pagina }: UltimoCambioQueryDto) {
    return this.service.ultimoCambio(pagina);
  }

  @Get('derivado/paginas')
  @RequiereMetodo(METODO_TRABAJO_HU)
  @ApiOperation({
    summary:
      'Las páginas de la VR: una por HU (su árbol y lo que la bloquea) y «Sin HU» al final',
  })
  @ApiResponse({ status: 200, type: [PaginaDto] })
  paginas(@Query() { espacio }: EspacioQueryDto) {
    return this.service.paginas(espacio);
  }

  @Get('derivado/plan')
  @RequiereMetodo(METODO_TRABAJO_HU)
  @ApiOperation({
    summary:
      'El tablero del plan: una columna por carril con sus piezas abiertas, en orden de ronda (?libro= una HU)',
  })
  @ApiResponse({ status: 200, type: [CarrilDto] })
  plan(@Query() { libro, espacio }: PlanQueryDto) {
    return this.service.plan(libro, espacio);
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
