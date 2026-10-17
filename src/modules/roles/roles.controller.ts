import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesResponseDto } from './dto/index.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @ApiOperation({
    summary: 'Los tipos de trabajo del área y las columnas de cada tablero',
  })
  @ApiResponse({ status: 200, type: RolesResponseDto })
  lista(): RolesResponseDto {
    const { defecto, roles, complementos } = this.service.todos();
    return {
      defecto: roles.length > 0 ? defecto : null,
      roles: roles.map(({ clave, nombre, para, etapas }) => ({
        clave,
        nombre,
        para,
        columnas: etapas.map(({ columna }) => columna),
        etapas: etapas.map(({ columna, que }) => ({ columna, que })),
      })),
      complementos: complementos.map((c) => ({ ...c })),
    };
  }
}
