import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTipoNodoDto } from './create-tipo-nodo.dto.js';

/** El nombre no se edita: renombrar un tipo obligaría a reescribir los nodos que lo usan. */
export class UpdateTipoNodoDto extends PartialType(
  OmitType(CreateTipoNodoDto, ['nombre'] as const),
) {}
