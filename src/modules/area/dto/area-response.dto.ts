import { ApiProperty } from '@nestjs/swagger';

export class EscaleraResponseDto {
  @ApiProperty({ example: 'negocio' })
  clave!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'contrastar con el código',
  })
  antes!: string | null;

  @ApiProperty({ type: [String], description: 'En orden' })
  personas!: string[];
}

export class RitualResponseDto {
  @ApiProperty({ example: 'daily' })
  clave!: string;

  @ApiProperty({ example: 'Daily' })
  nombre!: string;
}

export class AreaResponseDto {
  @ApiProperty({ type: [EscaleraResponseDto] })
  escaleras!: EscaleraResponseDto[];

  @ApiProperty({ type: [RitualResponseDto] })
  rituales!: RitualResponseDto[];
}
