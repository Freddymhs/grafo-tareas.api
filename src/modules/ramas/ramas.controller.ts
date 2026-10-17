import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/index.js';
import { NodoResponseDto } from '../nodos/dto/index.js';
import { CreateRamaDto, RamaResponseDto } from './dto/index.js';
import { RamasService } from './ramas.service.js';

@ApiTags('Ramas')
@Controller('ramas')
export class RamasController {
  constructor(private readonly service: RamasService) {}

  @Get()
  @ApiOperation({
    summary: 'Las ramas de color y cuántos nodos tiene cada una',
  })
  @ApiResponse({ status: 200, type: [RamaResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una rama de color' })
  @ApiResponse({ status: 201, type: NodoResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  create(@Body() dto: CreateRamaDto) {
    return this.service.create(dto);
  }
}
