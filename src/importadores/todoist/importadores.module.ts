import { Module } from '@nestjs/common';
import { NodosModule } from '../../modules/nodos/nodos.module.js';
import { ImportadorTodoistService } from './importador-todoist.service.js';
import { FETCH, TodoistClient } from './todoist.client.js';

/** Los importadores son el único lugar de la API que nombra una herramienta (concepto § Prueba de que sigue agnóstico). */
@Module({
  imports: [NodosModule],
  providers: [
    { provide: FETCH, useValue: fetch },
    TodoistClient,
    ImportadorTodoistService,
  ],
  exports: [ImportadorTodoistService],
})
export class ImportadoresModule {}
