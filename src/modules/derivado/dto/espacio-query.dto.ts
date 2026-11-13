import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class EspacioQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'El espacio (tiene que usar el método de trabajo); sin él, el del proyecto por defecto',
  })
  @IsOptional()
  @IsUUID()
  espacio?: string;
}
