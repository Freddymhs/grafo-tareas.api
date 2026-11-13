import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
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

export class UpdateEspacioDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_NOMBRE)
  nombre?: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orden?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archivado?: boolean;
}
