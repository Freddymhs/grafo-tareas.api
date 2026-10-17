import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsNumber,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { MAXIMO_POSICIONES_POR_LOTE } from '../../../common/constants/index.js';

export class PosicionNodoDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 1.25 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  x!: number;

  @ApiProperty({ example: 1.6 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  y!: number;

  @ApiProperty({ example: -2.4 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  z!: number;
}

export class GuardarPosicionesDto {
  @ApiProperty({ type: [PosicionNodoDto] })
  @ValidateNested({ each: true })
  @Type(() => PosicionNodoDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(MAXIMO_POSICIONES_POR_LOTE)
  posiciones!: PosicionNodoDto[];
}
