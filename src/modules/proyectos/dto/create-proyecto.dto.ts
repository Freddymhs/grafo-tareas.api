import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  LARGO_MAXIMO_NOMBRE,
  PATRON_COLOR_HEX,
} from '../../../common/constants/index.js';

export class CreateProyectoDto {
  @ApiProperty({ example: 'ThinkPad' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_NOMBRE)
  nombre!: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;
}
