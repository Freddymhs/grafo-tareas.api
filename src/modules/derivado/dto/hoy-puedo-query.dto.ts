import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class HoyPuedoQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Solo lo de este proyecto',
  })
  @IsOptional()
  @IsUUID()
  proyecto?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Solo lo de este espacio; sin proyecto ni espacio, todos los no archivados',
  })
  @IsOptional()
  @IsUUID()
  espacio?: string;
}
