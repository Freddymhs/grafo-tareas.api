import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NodoResumenDto } from '../../nodos/dto/index.js';

export class PlanQueryDto {
  @ApiPropertyOptional({
    description:
      'El libro (el id de la HU, o «sin-hu») cuyo plan se quiere ver; sin él, el plan de todas',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  libro?: string;
}

/** Una columna del tablero del plan (FASE 17): un carril del reparto con sus piezas abiertas, en orden de ronda. */
export class CarrilDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'La RAMA del carril; null = «Sin carril»',
  })
  id!: string | null;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ type: String, nullable: true })
  color!: string | null;

  @ApiProperty({ type: [NodoResumenDto] })
  nodos!: NodoResumenDto[];
}
