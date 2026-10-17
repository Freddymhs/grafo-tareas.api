// `pnpm importar:fases -- --backlog <docs/backlog> [--tareas <Tareas>] [--proyecto <nombre>] [--seco]` — los FASE_*.md del método al
// grafo (FASE 5 tarea 3). Corre desde `dist` (los alias `.js` no los resuelve ts-node). `--seco` cuenta sin escribir.
import { basename, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ImportadorFasesService } from './importador-fases.service';

const USO =
  'uso: importar:fases -- --backlog <carpeta con FASE_*.md> [--tareas <carpeta Tareas/>] [--proyecto <nombre>] [--seco]';
/** `<orquestador>/docs/backlog`: el proyecto por defecto es el nombre del orquestador. */
const DEL_BACKLOG_AL_ORQUESTADOR = '../..';
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
    proyecto,
    seco: argv.includes('--seco'),
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
