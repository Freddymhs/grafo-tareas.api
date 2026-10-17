import { ApiProperty } from '@nestjs/swagger';
import { TipoConexion } from '@prisma/client';

export class ConexionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  origenId!: string;

  @ApiProperty({ format: 'uuid' })
  destinoId!: string;

  @ApiProperty({ enum: TipoConexion })
  tipo!: TipoConexion;

  @ApiProperty()
  createdAt!: Date;
}
