import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNodo, TipoNodo } from '@prisma/client';

export class NodoResumenDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: TipoNodo })
  tipo!: TipoNodo;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ enum: EstadoNodo })
  estado!: EstadoNodo;

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
  externoOrigen!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posX!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posY!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number })
  posZ!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
