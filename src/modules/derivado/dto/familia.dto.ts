import { ApiProperty } from '@nestjs/swagger';

/** Lo que la VR ilumina al seleccionar un nodo (FASE 15). */
export class FamiliaResponseDto {
  @ApiProperty({
    type: [String],
    description:
      'El nodo, lo que cuelga de él (su árbol por PERTENECE_A) y con qué se conecta directo',
  })
  ids!: string[];
}
