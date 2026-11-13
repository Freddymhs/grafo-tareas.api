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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { ListarEspaciosDto } from '../espacios/dto/index.js';
import {
  CreateProyectoDto,
  ProyectoResponseDto,
  UpdateProyectoDto,
} from './dto/index.js';
import { ProyectosService } from './proyectos.service.js';

@ApiTags('Proyectos')
@Controller()
export class ProyectosController {
  constructor(private readonly service: ProyectosService) {}

  @Get('espacios/:espacioId/proyectos')
  @ApiOperation({ summary: 'Los proyectos de un espacio' })
  @ApiResponse({ status: 200, type: [ProyectoResponseDto] })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  listarDeEspacio(
    @Param('espacioId', ParseUUIDPipe) espacioId: string,
    @Query() query: ListarEspaciosDto,
  ) {
    return this.service.listarDeEspacio(espacioId, query);
  }

  @Post('espacios/:espacioId/proyectos')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un proyecto en un espacio' })
  @ApiResponse({ status: 201, type: ProyectoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(
    @Param('espacioId', ParseUUIDPipe) espacioId: string,
    @Body() dto: CreateProyectoDto,
  ) {
    return this.service.create(espacioId, dto);
  }

  @Patch('proyectos/:id')
  @ApiOperation({ summary: 'Editar o archivar un proyecto' })
  @ApiResponse({ status: 200, type: ProyectoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProyectoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('proyectos/:id')
  @ApiOperation({ summary: 'Borrar un proyecto sin nodos' })
  @ApiResponse({ status: 200, type: ProyectoResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
