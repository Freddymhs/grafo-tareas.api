import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';
import { MAXIMO_TARJETAS_DEL_DIA } from '../../../common/constants/index.js';

export class OrdenDelDiaDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Las tarjetas (TAREA) de AHORA, la primera arriba. Vacía = el día sin nada',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(MAXIMO_TARJETAS_DEL_DIA)
  ids!: string[];
}
