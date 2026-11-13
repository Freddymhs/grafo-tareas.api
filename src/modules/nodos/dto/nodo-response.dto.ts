import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cara, EstadoNodo } from '@prisma/client';

export class NodoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String })
  tipo!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ enum: EstadoNodo, nullable: true })
  estado!: EstadoNodo | null;

  @ApiProperty({ enum: Cara })
  cara!: Cara;

  @ApiPropertyOptional({ nullable: true, type: String })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  etapa!: string | null;

  @ApiProperty({ type: [String] })
  etiquetas!: string[];

  @ApiPropertyOptional({ nullable: true, type: Number })
  prioridad!: number | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date' })
  vence!: Date | null;
}

export class NodoResponseDto extends NodoResumenDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  descripcion!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  resumen!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoOrigen!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posX!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posY!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posZ!: number | null;

  @ApiProperty({
    description:
      'Cuándo nació en su fuente (la tarjeta en Todoist) o, si se creó acá, al crearse. Nunca vacía',
  })
  fechaOrigen!: Date;

  @ApiProperty({ format: 'uuid' })
  proyectoId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/** Lo que devuelve GET /nodos: una página. Declarado así para que Orval genere el tipo verdadero. */
export class PaginaNodosDto {
  @ApiProperty({ type: [NodoResponseDto] })
  data!: NodoResponseDto[];

  @ApiProperty({ description: 'Total que cumple el filtro, sin paginar' })
  total!: number;
}
