import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequiereMetodoGuard } from '../guards/requiere-metodo.guard.js';

import { METADATA_REQUIERE_METODO } from './requiere-metodo.metadata.js';

/** El endpoint solo existe en los espacios que enciende ese método de trabajo: en los demás, 404. */
export const RequiereMetodo = (metodo: string) =>
  applyDecorators(
    SetMetadata(METADATA_REQUIERE_METODO, metodo),
    UseGuards(RequiereMetodoGuard),
  );
