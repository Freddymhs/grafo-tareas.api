import { ApiProperty } from '@nestjs/swagger';
import { NodoResumenDto } from '../../nodos/dto/index.js';

export class BloqueadoResponseDto {
  @ApiProperty()
  bloqueado!: boolean;

  @ApiProperty({
    type: [NodoResumenDto],
    description:
      'Los nodos ABIERTOS de los que depende, a los que espera o que lo bloquean',
  })
  por!: NodoResumenDto[];
}

export class LiberaResponseDto {
  @ApiProperty({
    type: [NodoResumenDto],
    description: 'Quedan libres en cuanto se cierra el nodo',
  })
  directos!: NodoResumenDto[];

  @ApiProperty({
    type: [NodoResumenDto],
    description:
      'Quedan libres después, si lo liberado antes también se cierra',
  })
  cadena!: NodoResumenDto[];
}
