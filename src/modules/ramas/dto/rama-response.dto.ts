import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNodo } from '@prisma/client';

export class RamaResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  titulo!: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: '#3b82f6' })
  color!: string | null;

  @ApiProperty({ enum: EstadoNodo })
  estado!: EstadoNodo;

  @ApiProperty({ description: 'Nodos que PERTENECEN_A esta rama' })
  miembros!: number;
}
