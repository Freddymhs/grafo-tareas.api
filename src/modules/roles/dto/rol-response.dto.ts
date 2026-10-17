import { ApiProperty } from '@nestjs/swagger';

export class RolResponseDto {
  @ApiProperty({ example: 'calidad' })
  clave!: string;

  @ApiProperty({ example: 'Calidad' })
  nombre!: string;

  @ApiProperty()
  para!: string;

  @ApiProperty({
    type: [String],
    description:
      'Las columnas de su tablero, en orden (todas están en GET /etapas)',
  })
  columnas!: string[];
}

export class ComplementoDeCatalogoDto {
  @ApiProperty({ example: 'duda-negocio' })
  clave!: string;

  @ApiProperty({ example: 'Duda de negocio' })
  nombre!: string;

  @ApiProperty({ enum: ['DUDA', 'TAREA', 'DAILY_ITEM'] })
  nodo!: string;

  @ApiProperty({
    description: 'false = nota: fuera de «hoy puedo» y del tablero',
  })
  accionable!: boolean;

  @ApiProperty({ nullable: true, type: String, example: 'negocio' })
  escalera!: string | null;
}

export class RolesResponseDto {
  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'El rol de lo que no declara ninguno; null si la API no tiene roles',
  })
  defecto!: string | null;

  @ApiProperty({ type: [RolResponseDto] })
  roles!: RolResponseDto[];

  @ApiProperty({
    type: [ComplementoDeCatalogoDto],
    description: 'Lo que puede colgar de un PBI (FASE 9)',
  })
  complementos!: ComplementoDeCatalogoDto[];
}
