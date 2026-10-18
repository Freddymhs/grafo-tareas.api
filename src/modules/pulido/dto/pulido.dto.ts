import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCambio } from '@prisma/client';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const LARGO_MAXIMO_MOTIVO = 500;

export class DescartarDto {
  @ApiProperty({
    example:
      'Sin contenido: una sesión la archivó sin decir qué preguntas eran',
    description:
      'Por qué se descarta: queda en la bitácora para el contraste final',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(LARGO_MAXIMO_MOTIVO)
  motivo!: string;
}

export class RestaurarDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(LARGO_MAXIMO_MOTIVO)
  motivo?: string | null;
}

export class DescartadoResponseDto {
  @ApiProperty()
  nodoId!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  motivo!: string;

  @ApiProperty({ description: 'Las conexiones que se archivaron con el nodo' })
  conexionesArchivadas!: number;
}

export class RestauradoResponseDto {
  @ApiProperty()
  nodoId!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  conexionesRecuperadas!: number;

  @ApiProperty({
    description: 'Las que no vuelven: su otro extremo ya no existe',
  })
  conexionesPerdidas!: number;
}

export class DescarteResponseDto {
  @ApiProperty()
  nodoId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoOrigen!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoId!: string | null;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  motivo!: string;

  @ApiProperty()
  createdAt!: Date;
}

export class CambioResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nodoId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoOrigen!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  externoId!: string | null;

  @ApiProperty()
  titulo!: string;

  @ApiProperty({ enum: TipoCambio })
  tipo!: TipoCambio;

  @ApiPropertyOptional({ nullable: true, type: String })
  campo!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  antes!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  despues!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  motivo!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
