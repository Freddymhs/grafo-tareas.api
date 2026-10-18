import { Module } from '@nestjs/common';
import { AreaModule } from '../../modules/area/area.module.js';
import { NodosModule } from '../../modules/nodos/nodos.module.js';
import { RolesModule } from '../../modules/roles/roles.module.js';
import { ImportadorFasesService } from '../fases/importador-fases.service.js';
import { ImportadorTodoistService } from './importador-todoist.service.js';
import { FETCH, TodoistClient } from './todoist.client.js';

/** Los importadores son el único lugar de la API que nombra una herramienta (concepto § Prueba de que sigue agnóstico). */
@Module({
  imports: [NodosModule, RolesModule, AreaModule],
  providers: [
    { provide: FETCH, useValue: fetch },
    TodoistClient,
    ImportadorTodoistService,
    ImportadorFasesService,
  ],
  exports: [ImportadorTodoistService, ImportadorFasesService],
})
export class ImportadoresModule {}
