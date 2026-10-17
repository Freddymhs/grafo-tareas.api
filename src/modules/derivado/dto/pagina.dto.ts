import { ApiProperty } from '@nestjs/swagger';

/** Una página de la VR (FASE 15): una HU con lo suyo, o «Sin HU». La API decide qué hay; la VR la muestra. */
export class PaginaDto {
  @ApiProperty({ description: 'El id de la HU, o «sin-hu»' })
  id!: string;

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
}
