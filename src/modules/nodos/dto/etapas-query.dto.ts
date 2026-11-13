import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class EtapasQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Las etapas de este espacio',
  })
  @IsOptional()
  @IsUUID()
  espacio?: string;
}
