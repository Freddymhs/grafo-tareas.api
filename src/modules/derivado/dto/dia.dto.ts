import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { NodoResumenDto } from '../../nodos/dto/index.js';

export class DiaQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-16T09:00:00-03:00',
    description:
      'Desde cuándo cuenta «terminé» (por defecto, las últimas 24 h)',
  })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'El espacio (tiene que usar el método de trabajo); sin él, el del proyecto por defecto',
  })
  @IsOptional()
  @IsUUID()
  espacio?: string;
}

export class EnCursoDto {
  @ApiProperty({ type: NodoResumenDto })
  nodo!: NodoResumenDto;

  @ApiProperty({ example: 'EN CODIGO' })
  etapa!: string;

  @ApiProperty()
  bloqueado!: boolean;
}

export class DetenidoDto {
  @ApiProperty({ type: NodoResumenDto })
  nodo!: NodoResumenDto;

  @ApiProperty({ type: [NodoResumenDto], description: 'Qué lo frena' })
  por!: NodoResumenDto[];
}

export class ParaDecirDto {
  @ApiProperty({ type: NodoResumenDto })
  nodo!: NodoResumenDto;

  @ApiProperty({ example: 'Daily' })
  ritual!: string;
}

export class DiaResponseDto {
  @ApiProperty()
  desde!: Date;

  @ApiProperty({ description: 'Más de esto en curso se avisa' })
  limiteEnCurso!: number;

  @ApiProperty({
    type: [NodoResumenDto],
    description: 'Tareas y FASE cerradas desde `desde`',
  })
  terminado!: NodoResumenDto[];

  @ApiProperty({
    type: [EnCursoDto],
    description: 'Abiertas en una etapa `curso` de roles.yaml',
  })
  enCurso!: EnCursoDto[];

  @ApiProperty({
    type: [DetenidoDto],
    description: 'Abiertas en el tablero (con etapa) y bloqueadas',
  })
  detenido!: DetenidoDto[];

  @ApiProperty({
    type: [ParaDecirDto],
    description: '«Para decir» abiertos, con su ritual',
  })
  paraDecir!: ParaDecirDto[];

  @ApiProperty({
    type: [NodoResumenDto],
    description:
      'Trámites de cierre pendientes (URL commit, evidencias…) que dejó importar:fases',
  })
  tramites!: NodoResumenDto[];
}
