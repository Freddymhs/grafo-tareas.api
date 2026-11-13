import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProyectoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  espacioId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  color!: string | null;

  @ApiProperty()
  orden!: number;

  @ApiProperty()
  archivado!: boolean;
}
