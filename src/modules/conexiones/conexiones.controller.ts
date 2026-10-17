import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { ConexionesService } from './conexiones.service.js';
import {
  ConexionResponseDto,
  CreateConexionDto,
  ListarConexionesDto,
} from './dto/index.js';

@ApiTags('Conexiones')
@Controller('conexiones')
export class ConexionesController {
  constructor(private readonly service: ConexionesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar conexiones, de un nodo o de un tipo' })
  @ApiResponse({ status: 200, type: [ConexionResponseDto] })
  findAll(@Query() query: ListarConexionesDto) {
    return this.service.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Conectar dos nodos' })
  @ApiResponse({ status: 201, type: ConexionResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(@Body() dto: CreateConexionDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar una conexión' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
