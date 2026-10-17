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
}
