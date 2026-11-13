import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TipoNodoResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  espacioId!: string;

  @ApiProperty()
  nombre!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  forma!: string | null;

  @ApiProperty()
  tieneCiclo!: boolean;

  @ApiProperty()
  accionable!: boolean;
}

export class TipoConexionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  bloquea!: boolean;

  @ApiProperty()
  contiene!: boolean;

  @ApiProperty()
  simetrica!: boolean;
}
