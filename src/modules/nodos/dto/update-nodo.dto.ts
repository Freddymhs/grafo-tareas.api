import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateNodoDto } from './create-nodo.dto.js';

/** El tipo y el origen externo no cambian: definen qué es el nodo y de dónde vino. */
export class UpdateNodoDto extends PartialType(
  OmitType(CreateNodoDto, ['tipo', 'externoOrigen', 'externoId'] as const),
) {}
