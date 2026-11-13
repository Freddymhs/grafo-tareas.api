import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
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

export class CreateTipoNodoDto {
  @ApiProperty({ example: 'HERRAMIENTA' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_NOMBRE)
  nombre!: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;

  @ApiPropertyOptional({ example: 'esfera', description: 'La forma en la VR' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  forma?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'Con ciclo, el nodo está ABIERTO o CERRADO; sin él, no tiene estado',
  })
  @IsOptional()
  @IsBoolean()
  tieneCiclo?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Entra a «hoy puedo»',
  })
  @IsOptional()
  @IsBoolean()
  accionable?: boolean;
}
