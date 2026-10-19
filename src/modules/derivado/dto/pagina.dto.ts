import { ApiProperty } from '@nestjs/swagger';
import { Cara } from '@prisma/client';

/**
 * Una página de la VR (FASE 15): una HU con lo suyo, o «Sin HU». Cada una es un libro de dos caras (FASE 17): lo real y,
 * si tiene, el plan. La API decide qué hay; la VR la muestra.
 */
export class PaginaDto {
  @ApiProperty({
    description:
      'El id de la HU, o «sin-hu»; la cara plan lleva «:plan» al final',
  })
  id!: string;

  @ApiProperty({
    description:
      'El libro: el id de la página real. Las dos caras de una HU comparten libro',
  })
  libro!: string;

  @ApiProperty({ enum: Cara })
  cara!: Cara;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ type: String, nullable: true })
  historiaId!: string | null;

  @ApiProperty({
    type: [String],
    description:
      'Los nodos de la página: el árbol de la HU y lo que bloquea a lo suyo (un salto)',
  })
  nodos!: string[];

  @ApiProperty({ description: 'Tareas abiertas de la página' })
  abiertas!: number;

  @ApiProperty({
    type: [String],
    description:
      'Lo que frena en la página: lo abierto de lo que algo abierto de ella depende, espera respuesta o está bloqueado',
  })
  frenan!: string[];
}
