import { TIPO_CONEXION } from '../../../common/constants/tipos.constants.js';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

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

  @ApiProperty({ type: String, example: TIPO_CONEXION.DEPENDE_DE })
  @IsString()
  @IsNotEmpty()
  tipo!: string;
}
