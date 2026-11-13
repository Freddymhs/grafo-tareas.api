import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import {
  CreateTipoConexionDto,
  CreateTipoNodoDto,
  TipoConexionResponseDto,
  TipoNodoResponseDto,
  UpdateTipoNodoDto,
} from './dto/index.js';
import { TiposService } from './tipos.service.js';

@ApiTags('Tipos')
@Controller()
export class TiposController {
  constructor(private readonly service: TiposService) {}

  @Get('espacios/:espacioId/tipos-nodo')
  @ApiOperation({ summary: 'Los tipos de nodo de un espacio' })
  @ApiResponse({ status: 200, type: [TipoNodoResponseDto] })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  listarNodo(@Param('espacioId', ParseUUIDPipe) espacioId: string) {
    return this.service.listarNodo(espacioId);
  }

  @Post('espacios/:espacioId/tipos-nodo')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un tipo de nodo en un espacio' })
  @ApiResponse({ status: 201, type: TipoNodoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  crearNodo(
    @Param('espacioId', ParseUUIDPipe) espacioId: string,
    @Body() dto: CreateTipoNodoDto,
  ) {
    return this.service.crearNodo(espacioId, dto);
  }

  @Patch('tipos-nodo/:id')
  @ApiOperation({ summary: 'Editar un tipo de nodo (el nombre no se edita)' })
  @ApiResponse({ status: 200, type: TipoNodoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  actualizarNodo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTipoNodoDto,
  ) {
    return this.service.actualizarNodo(id, dto);
  }

  @Get('tipos-conexion')
  @ApiOperation({ summary: 'Los tipos de conexión (globales)' })
  @ApiResponse({ status: 200, type: [TipoConexionResponseDto] })
  listarConexion() {
    return this.service.listarConexion();
  }

  @Post('tipos-conexion')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un tipo de conexión' })
  @ApiResponse({ status: 201, type: TipoConexionResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  crearConexion(@Body() dto: CreateTipoConexionDto) {
    return this.service.crearConexion(dto);
  }
}
