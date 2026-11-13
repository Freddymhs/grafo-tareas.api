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
import {
  CreateEspacioDto,
  EspacioResponseDto,
  ListarEspaciosDto,
  UpdateEspacioDto,
} from './dto/index.js';
import { EspaciosService } from './espacios.service.js';

@ApiTags('Espacios')
@Controller('espacios')
export class EspaciosController {
  constructor(private readonly service: EspaciosService) {}

  @Get()
  @ApiOperation({ summary: 'Los espacios (sin los archivados por defecto)' })
  @ApiResponse({ status: 200, type: [EspacioResponseDto] })
  findAll(@Query() query: ListarEspaciosDto) {
    return this.service.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Crear un espacio con su proyecto General y los tipos y etapas de la plantilla',
  })
  @ApiResponse({ status: 201, type: EspacioResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  create(@Body() dto: CreateEspacioDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar o archivar un espacio' })
  @ApiResponse({ status: 200, type: EspacioResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEspacioDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrar un espacio sin nodos' })
  @ApiResponse({ status: 200, type: EspacioResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  @ApiResponse({ status: 409, type: ErrorResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
