// `pnpm importar:fases -- --backlog <docs/backlog> [--tareas <Tareas>] [--roles <roles.yaml>] [--proyecto <nombre>] --proyecto-grafo <uuid> [--padres <json>] [--seco] [--podar]` —
// los FASE_*.md del método al grafo (FASE 5 tarea 3; el rol y la etapa salen del roles.yaml del área, FASE 8).
// Corre desde `dist` (los alias `.js` no los resuelve ts-node). `--seco` cuenta sin escribir. `--podar` borra las
// dependencias entre FASE que ningún .md declara (A.1); sin él solo se informan en `dependenciasViejas`.
import { basename, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { proyectoGrafoDe } from '../proyecto-grafo';
import { ImportadorFasesService } from './importador-fases.service';

const USO =
  'uso: importar:fases -- --backlog <carpeta con FASE_*.md> [--tareas <carpeta Tareas/>] [--roles <roles.yaml>] [--proyecto <nombre>] --proyecto-grafo <uuid> [--adoptar <origen>] [--padres <json>] [--seco] [--podar]';
/** `<orquestador>/docs/backlog`: el proyecto por defecto es el nombre del orquestador. */
const DEL_BACKLOG_AL_ORQUESTADOR = '../..';
/** `<orquestador>/docs/roles.yaml`: el del área, al lado del backlog. */
const ROLES_DEL_AREA = '../roles.yaml';
const EXIT_USO = 64;

function valorDe(argv: readonly string[], bandera: string): string | null {
  const indice = argv.indexOf(bandera);
  const valor = indice >= 0 ? argv[indice + 1] : undefined;
  if (indice >= 0 && (!valor || valor.startsWith('--'))) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  return valor ? resolve(valor) : null;
}

/** Un valor que no es ruta (el nombre de un origen). */
function textoDe(argv: readonly string[], bandera: string): string | null {
  const indice = argv.indexOf(bandera);
  if (indice < 0) return null;
  const valor = argv[indice + 1];
  if (!valor || valor.startsWith('--')) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  return valor;
}

function leerArgumentos(argv: readonly string[]) {
  const backlog = valorDe(argv, '--backlog');
  if (!backlog) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  const indice = argv.indexOf('--proyecto');
  const proyecto =
    indice >= 0
      ? argv[indice + 1]
      : basename(resolve(backlog, DEL_BACKLOG_AL_ORQUESTADOR));
  if (!proyecto || proyecto.startsWith('--')) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  return {
    backlog,
    tareas: valorDe(argv, '--tareas'),
    roles: valorDe(argv, '--roles') ?? resolve(backlog, ROLES_DEL_AREA),
    adoptar: textoDe(argv, '--adoptar'),
    padres: valorDe(argv, '--padres'),
    proyecto,
    proyectoGrafo: proyectoGrafoDe(argv),
    seco: argv.includes('--seco'),
    podar: argv.includes('--podar'),
  };
}

async function main() {
  const opciones = leerArgumentos(process.argv.slice(2));
  // abortOnError: false — con el logger apagado, Nest abortaría en silencio y el error nunca se vería.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const resumen = await app.get(ImportadorFasesService).importar(opciones);
    console.log(JSON.stringify(resumen, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
