import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LARGO_MAXIMO_TITULO,
  PRIORIDAD_MAXIMA,
  PRIORIDAD_MINIMA,
} from '../../../common/constants/index.js';

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

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'A quién espera (una PERSONA): queda ESPERA_RESPUESTA_DE en la misma llamada. Un bloqueante nace entero, sin tres pedidos',
  })
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: PRIORIDAD_MINIMA,
    maximum: PRIORIDAD_MAXIMA,
    description: '1 = la más urgente',
  })
  @IsOptional()
  @IsInt()
  @Min(PRIORIDAD_MINIMA)
  @Max(PRIORIDAD_MAXIMA)
  prioridad?: number;
}
