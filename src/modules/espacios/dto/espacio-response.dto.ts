import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EspacioResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  color!: string | null;

  @ApiProperty()
  orden!: number;

  @ApiProperty()
  archivado!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'El método de trabajo que enciende (solo SIGSA: trabajo-hu)',
  })
  metodo!: string | null;

  @ApiProperty({ type: [String] })
  etapas!: string[];
}
