import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
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
}
