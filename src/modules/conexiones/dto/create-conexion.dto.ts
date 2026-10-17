import { ApiProperty } from '@nestjs/swagger';
import { TipoConexion } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class CreateConexionDto {
  @ApiProperty({
    format: 'uuid',
    description: 'El nodo que depende / pertenece',
  })
  @IsUUID()
  origenId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'El nodo del que depende / al que pertenece',
  })
  @IsUUID()
  destinoId!: string;

  @ApiProperty({ enum: TipoConexion, example: TipoConexion.DEPENDE_DE })
  @IsEnum(TipoConexion)
  tipo!: TipoConexion;
}
