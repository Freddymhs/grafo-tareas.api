import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { LIMITE_MAXIMO_PAGINA } from '../constants/index.js';

export class PaginationQueryDto {
  @ApiProperty({ required: false, default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;

  @ApiProperty({
    required: false,
    default: 20,
    minimum: 1,
    maximum: LIMITE_MAXIMO_PAGINA,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO_PAGINA)
  limit: number = 20;
}

export interface PaginatedMeta {
  timestamp: string;
  path: string;
  total: number;
  offset: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  statusCode: number;
  data: T[];
  meta: PaginatedMeta;
}
