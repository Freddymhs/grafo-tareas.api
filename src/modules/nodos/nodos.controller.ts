import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import {
  CreateNodoDto,
  GuardarPosicionesDto,
  ListarNodosDto,
  NodoResponseDto,
  PaginaNodosDto,
  UpdateNodoDto,
} from './dto/index.js';
import { NodosService } from './nodos.service.js';

@ApiTags('Nodos')
@Controller('nodos')
export class NodosController {
  constructor(private readonly service: NodosService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar nodos: por tipo, estado, etapa, etiqueta, rol, rama o texto',
  })
  @ApiResponse({ status: 200, type: PaginaNodosDto })
  findAll(@Query() query: ListarNodosDto) {
    return this.service.findAll(query);
  }

  @Put('posiciones')
  @ApiOperation({
    summary: 'Guardar las posiciones del mapa 3D en lote (todo o nada)',
  })
  @ApiResponse({ status: 200, description: '{ guardadas: n }' })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  guardarPosiciones(@Body() dto: GuardarPosicionesDto) {
    return this.service.guardarPosiciones(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un nodo' })
  @ApiResponse({ status: 200, type: NodoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nodo' })
  @ApiResponse({ status: 201, type: NodoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(@Body() dto: CreateNodoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar un nodo (título, estado, color…)' })
  @ApiResponse({ status: 200, type: NodoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNodoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un nodo y sus conexiones' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
