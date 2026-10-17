import { ApiProperty } from '@nestjs/swagger';
import { NodoResponseDto } from '../../nodos/dto/index.js';

export class ComplementoResponseDto extends NodoResponseDto {
  @ApiProperty({
    example: 'duda-negocio',
    description:
      'La clave del catálogo (sale de su etiqueta complemento:<clave>)',
  })
  complemento!: string;
}
