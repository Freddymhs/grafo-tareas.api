import { RequiereMetodo } from '../../common/decorators/index.js';
import { METODO_TRABAJO_HU } from '../../common/constants/index.js';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AreaService } from './area.service.js';
import { AreaResponseDto } from './dto/index.js';

@RequiereMetodo(METODO_TRABAJO_HU)
@ApiTags('Area')
@Controller('area')
export class AreaController {
  constructor(private readonly service: AreaService) {}

  @Get()
  @ApiOperation({
    summary: 'Escaleras de dudas y rituales del área (refs.yaml)',
  })
  @ApiResponse({ status: 200, type: AreaResponseDto })
  todo(): AreaResponseDto {
    const { escaleras, rituales } = this.service.todo();
    return {
      escaleras: escaleras.map((e) => ({ ...e, personas: [...e.personas] })),
      rituales: rituales.map((r) => ({ ...r })),
    };
  }
}
