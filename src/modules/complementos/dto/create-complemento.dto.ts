import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LARGO_MAXIMO_TITULO } from '../../../common/constants/index.js';

export class CreateComplementoDto {
  @ApiProperty({
    example: 'duda-negocio',
    description: 'La clave de un complemento del catálogo (GET /roles)',
  })
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @ApiProperty({ example: '¿La solicitud tiene que quedar aprobada?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  titulo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    example: 'daily',
    description:
      'Para un complemento DAILY_ITEM («para decir»): en qué ritual de GET /area se dice',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ritual?: string;
}
