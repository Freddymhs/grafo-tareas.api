import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListarConexionesDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Conexiones que salen o entran a este nodo',
  })
  @IsOptional()
  @IsUUID()
  nodoId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipo?: string;
}
