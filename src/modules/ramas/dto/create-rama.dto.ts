import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import {
  LARGO_MAXIMO_TITULO,
  PATRON_COLOR_HEX,
} from '../../../common/constants/index.js';

export class CreateRamaDto {
  @ApiProperty({ example: 'Control fronterizo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  titulo!: string;

  @ApiProperty({ example: '#3b82f6' })
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color!: string;
}
