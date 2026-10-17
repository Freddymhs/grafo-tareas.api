import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  LARGO_MAXIMO_TITULO,
  PATRON_COLOR_HEX,
} from '../../../common/constants/index.js';

export class CreateNodoDto {
  @ApiProperty({ enum: TipoNodo, example: TipoNodo.TAREA })
  @IsEnum(TipoNodo)
  tipo!: TipoNodo;

  @ApiProperty({ example: 'Revisar la colección del PBI 24972' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  titulo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ enum: EstadoNodo, default: EstadoNodo.ABIERTO })
  @IsOptional()
  @IsEnum(EstadoNodo)
  estado?: EstadoNodo;

  @ApiPropertyOptional({
    example: '#3b82f6',
    description: 'Solo para nodos RAMA',
  })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;

  @ApiPropertyOptional({
    example: 'mi-tablero',
    description: 'Herramienta de origen (texto libre). Va junto con externoId',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externoOrigen?: string;

  @ApiPropertyOptional({ example: '6Vh...' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externoId?: string;
}
