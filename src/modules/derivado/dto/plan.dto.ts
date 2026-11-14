import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
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

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'El espacio (tiene que usar el método de trabajo); sin él, el del proyecto por defecto',
  })
  @IsOptional()
  @IsUUID()
  espacio?: string;
}

/** Un carril que la pieza lleva a la vista: el suyo o uno que espera (`calcularPelotitas`). */
export class PelotitaDto {
  @ApiProperty({ description: 'El título del carril' })
  carril!: string;

  @ApiProperty()
  color!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      'En la de otro carril: el número de la tarjeta que espera en esa línea (la última si son varias); null en la propia',
  })
  espera!: number | null;
}

/** Una pieza del plan: la tarjeta, con su carril y los otros carriles que espera por sus DEPENDE_DE. */
export class PiezaDelPlanDto extends NodoResumenDto {
  @ApiProperty({
    type: [PelotitaDto],
    description:
      'La primera, su carril; las demás, una por cada otro carril del que depende (como el viejo tablero del plan)',
  })
  pelotitas!: PelotitaDto[];

  @ApiProperty({
    description:
      'Su lugar en la cadena de DEPENDE_DE de su carril: 1 si no depende de nada de su carril',
  })
  orden!: number;
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

  @ApiProperty({ type: [PiezaDelPlanDto] })
  nodos!: PiezaDelPlanDto[];
}
