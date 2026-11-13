import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export const aBooleano = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class ListarEspaciosDto {
  @ApiPropertyOptional({ type: Boolean, default: false })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  archivados?: boolean;
}
