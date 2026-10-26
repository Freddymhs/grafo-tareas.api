import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UltimoCambioQueryDto {
  @ApiProperty({
    description: 'La página (su id de GET /derivado/paginas)',
  })
  @IsString()
  @IsNotEmpty()
  pagina!: string;
}

export class UltimoCambioDto {
  @ApiProperty({ format: 'uuid' })
  nodoId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  cuando!: Date;

  @ApiProperty({
    description: 'Lo que pasó, en palabras: «pasó a Trabajo», «se cerró»…',
  })
  que!: string;
}

/** Lo último que cambió en una página; `ultimo` es null si nada de ella cambió. */
export class UltimoCambioResponseDto {
  @ApiProperty({ type: UltimoCambioDto, nullable: true })
  ultimo!: UltimoCambioDto | null;
}
