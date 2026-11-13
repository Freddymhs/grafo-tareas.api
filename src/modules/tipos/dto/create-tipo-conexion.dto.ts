import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LARGO_MAXIMO_NOMBRE } from '../../../common/constants/index.js';

export class CreateTipoConexionDto {
  @ApiProperty({ example: 'SE_RELACIONA_CON' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_NOMBRE)
  nombre!: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Bloquea al origen mientras el destino siga ABIERTO',
  })
  @IsOptional()
  @IsBoolean()
  bloquea?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'El destino contiene al origen (agrupa: el papel de PERTENECE_A)',
  })
  @IsOptional()
  @IsBoolean()
  contiene?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  simetrica?: boolean;
}
