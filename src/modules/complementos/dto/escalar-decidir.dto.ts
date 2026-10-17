import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LARGO_MAXIMO_TITULO } from '../../../common/constants/index.js';

export class EscalarDto {
  @ApiPropertyOptional({
    example: 'Nicolás',
    description:
      'A quién, si no es el siguiente de la escalera (p. ej. el senior de front en vez del de back)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  persona?: string;
}

export class DecidirDto {
  @ApiProperty({ example: 'Tomás Carabantes' })
  @IsString()
  @IsNotEmpty()
  quien!: string;

  @ApiProperty({
    example: 'comentario en el PBI 25699',
    description: 'Dónde quedó registrada la respuesta',
  })
  @IsString()
  @IsNotEmpty()
  donde!: string;

  @ApiProperty({ example: 'La solicitud tiene que quedar aprobada' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  texto!: string;
}
