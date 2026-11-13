import { ApiProperty } from '@nestjs/swagger';

export class ConexionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  origenId!: string;

  @ApiProperty({ format: 'uuid' })
  destinoId!: string;

  @ApiProperty({ type: String })
  tipo!: string;

  @ApiProperty()
  createdAt!: Date;
}
