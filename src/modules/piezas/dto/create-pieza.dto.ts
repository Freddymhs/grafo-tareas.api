import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { LARGO_MAXIMO_TITULO } from '../../../common/constants/index.js';

export class CreatePiezaDto {
  @ApiProperty({
    example: 'C · Recepción',
    description:
      'El carril del reparto, «<letra> · <zona>»: una columna del plan',
  })
  @IsString()
  @IsNotEmpty()
  carril!: string;

  @ApiProperty({
    example: '2️⃣ 20379 · 0.4 · Catálogo de criterios del checklist · por crear',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  titulo!: string;

  @ApiProperty({
    example:
      '# 0.4 · Catálogo de criterios del checklist   HU 20379 · task por crear · reparto 2026-10-18',
    description:
      'La especificación de la pieza; su primera línea es la cabecera del reparto, de donde sale su HU',
  })
  @IsString()
  @IsNotEmpty()
  descripcion!: string;
}
