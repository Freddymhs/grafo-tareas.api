import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
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
import { NOMBRES_PLANTILLAS, type NombrePlantilla } from '../plantillas.js';

export class CreateEspacioDto {
  @ApiProperty({ example: 'Mis máquinas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_NOMBRE)
  nombre!: string;

  @ApiPropertyOptional({ example: '#3b82f6' })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;

  @ApiProperty({
    enum: NOMBRES_PLANTILLAS,
    description: 'Los tipos y las etapas con que nace el espacio',
  })
  @IsIn(NOMBRES_PLANTILLAS)
  plantilla!: NombrePlantilla;
}
