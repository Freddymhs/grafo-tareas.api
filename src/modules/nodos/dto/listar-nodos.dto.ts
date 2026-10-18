import { ApiPropertyOptional } from '@nestjs/swagger';
import { Cara, EstadoNodo, TipoNodo } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  LARGO_MAXIMO_BUSQUEDA,
  OCULTAR_NOTAS,
} from '../../../common/constants/index.js';
import { PaginationQueryDto } from '../../../common/dto/index.js';

export class ListarNodosDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TipoNodo })
  @IsOptional()
  @IsEnum(TipoNodo)
  tipo?: TipoNodo;

  @ApiPropertyOptional({ enum: EstadoNodo })
  @IsOptional()
  @IsEnum(EstadoNodo)
  estado?: EstadoNodo;

  @ApiPropertyOptional({
    enum: Cara,
    description:
      'Solo los de esta cara de su HU (FASE 17): REAL = el trabajo, PLAN = el Draft',
  })
  @IsOptional()
  @IsEnum(Cara)
  cara?: Cara;

  @ApiPropertyOptional({
    example: 'sin-hu',
    description:
      'Solo los nodos de esta HU (el libro de GET /derivado/paginas: el id de la HU, o «sin-hu»), en la cara pedida (por defecto REAL)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  libro?: string;

  @ApiPropertyOptional({
    example: 'ENTENDIMIENTO',
    description: 'Columna del tablero; vacía ("") = sin etapa',
  })
  @IsOptional()
  @IsString()
  etapa?: string;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  etiqueta?: string;

  @ApiPropertyOptional({
    example: 'calidad',
    description:
      'Solo los nodos de este rol (GET /roles): llevan su etiqueta; los del defecto, la de ningún otro',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  rol?: string;

  @ApiPropertyOptional({
    enum: [OCULTAR_NOTAS],
    description:
      'ocultar = sin los complementos que son notas (dolor, apunte, decisión…): el tablero',
  })
  @IsOptional()
  @IsIn([OCULTAR_NOTAS])
  notas?: typeof OCULTAR_NOTAS;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Solo los nodos que PERTENECEN_A esta rama',
  })
  @IsOptional()
  @IsUUID()
  rama?: string;

  @ApiPropertyOptional({
    example: '25327',
    description: 'Busca en título y descripción, sin distinguir mayúsculas',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_BUSQUEDA)
  q?: string;
}
