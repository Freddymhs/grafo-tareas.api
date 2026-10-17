import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoConexion } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListarConexionesDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Conexiones que salen o entran a este nodo',
  })
  @IsOptional()
  @IsUUID()
  nodoId?: string;

  @ApiPropertyOptional({ enum: TipoConexion })
  @IsOptional()
  @IsEnum(TipoConexion)
  tipo?: TipoConexion;
}
