import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { LARGO_MAXIMO_BUSQUEDA } from '../../../common/constants/index.js';
import { PaginationQueryDto } from '../../../common/dto/index.js';

export class ListarNodosDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TipoNodo })
  @IsOptional()
  @IsEnum(TipoNodo)
  tipo?: TipoNodo;

  @ApiPropertyOptional({ enum: EstadoNodo })
  @IsOptional()
  @IsEnum(EstadoNodo)
  estado?: EstadoNodo;

  @ApiPropertyOptional({
    example: 'ENTENDIMIENTO',
    description: 'Columna del tablero; vacía ("") = sin etapa',
  })
  @IsOptional()
  @IsString()
  etapa?: string;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  etiqueta?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Solo los nodos que PERTENECEN_A esta rama',
  })
  @IsOptional()
  @IsUUID()
  rama?: string;

  @ApiPropertyOptional({
    example: '25327',
    description: 'Busca en título y descripción, sin distinguir mayúsculas',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_BUSQUEDA)
  q?: string;
}
