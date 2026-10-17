import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CreateNodoDto } from './create-nodo.dto.js';

/** El tipo y el origen externo no cambian: definen qué es el nodo y de dónde vino. */
export class UpdateNodoDto extends PartialType(
  OmitType(CreateNodoDto, [
    'tipo',
    'externoOrigen',
    'externoId',
    'etapa',
  ] as const),
) {
  /** `null` saca el nodo del tablero (vuelve a la entrada). Al crear no hace falta: nace sin etapa. */
  @ApiPropertyOptional({
    example: 'ENTENDIMIENTO',
    nullable: true,
    type: String,
    description:
      'Columna del tablero: una de GET /etapas. null = vuelve a la entrada',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  etapa?: string | null;
}
