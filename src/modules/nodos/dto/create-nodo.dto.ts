import { TIPO_NODO } from '../../../common/constants/tipos.constants.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cara, EstadoNodo } from '@prisma/client';
import {
  ArrayUnique,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  LARGO_MAXIMO_ETIQUETA,
  LARGO_MAXIMO_RESUMEN,
  LARGO_MAXIMO_TITULO,
  PATRON_COLOR_HEX,
  PRIORIDAD_MAXIMA,
  PRIORIDAD_MINIMA,
} from '../../../common/constants/index.js';

export class CreateNodoDto {
  @ApiProperty({ type: String, example: TIPO_NODO.TAREA })
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @ApiProperty({ example: 'Revisar la colección del PBI 24972' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_TITULO)
  titulo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({
    description:
      'Una línea, con las palabras del humano: de qué trata el nodo (la VR la muestra al seleccionarlo)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(LARGO_MAXIMO_RESUMEN)
  resumen?: string;

  @ApiPropertyOptional({ enum: EstadoNodo, default: EstadoNodo.ABIERTO })
  @IsOptional()
  @IsEnum(EstadoNodo)
  estado?: EstadoNodo;

  @ApiPropertyOptional({
    enum: Cara,
    default: Cara.REAL,
    description:
      'De qué cara de su HU es (FASE 17): REAL = lo que se trabaja; PLAN = lo que se intuyó (Draft trabajo)',
  })
  @IsOptional()
  @IsEnum(Cara)
  cara?: Cara;

  @ApiPropertyOptional({
    example: 'ENTENDIMIENTO',
    description: 'Columna del tablero: una de GET /etapas. Sin etapa = entrada',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  etapa?: string;

  @ApiPropertyOptional({ example: ['daily', 'propuesta'], type: [String] })
  @IsOptional()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(LARGO_MAXIMO_ETIQUETA, { each: true })
  @ArrayUnique()
  etiquetas?: string[];

  @ApiPropertyOptional({
    example: 2,
    minimum: PRIORIDAD_MINIMA,
    maximum: PRIORIDAD_MAXIMA,
    description: '1 = la más urgente',
  })
  @IsOptional()
  @IsInt()
  @Min(PRIORIDAD_MINIMA)
  @Max(PRIORIDAD_MAXIMA)
  prioridad?: number;

  @ApiPropertyOptional({
    example: '2026-10-20',
    description: 'Fecha YYYY-MM-DD',
  })
  @IsOptional()
  @IsDateString()
  vence?: string;

  @ApiPropertyOptional({
    example: '#3b82f6',
    description: 'Solo para nodos RAMA',
  })
  @IsOptional()
  @Matches(PATRON_COLOR_HEX, { message: 'color debe ser #rrggbb' })
  color?: string;

  @ApiPropertyOptional({
    example: 'mi-tablero',
    description: 'Herramienta de origen (texto libre). Va junto con externoId',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externoOrigen?: string;

  @ApiPropertyOptional({ example: '6Vh...' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  externoId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'El proyecto del nodo. Sin él cae en el proyecto por defecto y la respuesta lo avisa (header X-Aviso-Proyecto)',
  })
  @IsOptional()
  @IsUUID()
  proyectoId?: string;
}
