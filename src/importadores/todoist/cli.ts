// `pnpm importar:todoist -- --proyecto <id> --proyecto-grafo <uuid> [--cara PLAN] [--fases-de <proyecto>] [--seco]` — la migración de Todoist al grafo (FASE 3).
// `--fases-de laboratorio`: «FASE 22» en un título es la FASE 22 de ese orquestador (`fases-md:laboratorio`), no una copia.
// Corre desde `dist` (los alias `.js` no los resuelve ts-node). `--seco` traduce y cuenta sin escribir. `--cara PLAN`:
// el proyecto es el plan de sus HU («🚀 Draft trabajo», FASE 17); sin él, sus tareas son lo real.
import { NestFactory } from '@nestjs/core';
import { Cara } from '@prisma/client';
import { AppModule } from '../../app.module';
import { origenFases } from '../fases/traducir-fases';
import { proyectoGrafoDe } from '../proyecto-grafo';
import { ImportadorTodoistService } from './importador-todoist.service';

const USO =
  'uso: importar:todoist -- --proyecto <id-de-todoist> [--cara REAL|PLAN] [--fases-de <proyecto>] --proyecto-grafo <uuid> [--seco]';
const EXIT_USO = 64;

const valorDe = (argv: readonly string[], opcion: string) => {
  const indice = argv.indexOf(opcion);
  return indice >= 0 ? argv[indice + 1] : undefined;
};
const esCara = (valor: string | undefined): valor is Cara =>
  Object.values<string | undefined>(Cara).includes(valor);

function leerArgumentos(argv: readonly string[]) {
  const proyectoId = valorDe(argv, '--proyecto');
  const pedida = argv.includes('--cara') ? valorDe(argv, '--cara') : Cara.REAL;
  if (!proyectoId || proyectoId.startsWith('--') || !esCara(pedida)) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  // «FASE 22» en un título es la FASE 22 del orquestador que se nombra: cuelga de ella, no se duplica (C10).
  const fasesDe = argv.includes('--fases-de')
    ? valorDe(argv, '--fases-de')
    : undefined;
  if (argv.includes('--fases-de') && (!fasesDe || fasesDe.startsWith('--'))) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  return {
    proyectoId,
    proyectoGrafo: proyectoGrafoDe(argv),
    cara: pedida,
    origenFases: fasesDe ? origenFases(fasesDe) : null,
    seco: argv.includes('--seco'),
  };
}

async function main() {
  const {
    proyectoId,
    proyectoGrafo,
    cara,
    origenFases: deFases,
    seco,
  } = leerArgumentos(process.argv.slice(2));
  // abortOnError: false — con el logger apagado, Nest abortaría en silencio y el error nunca se vería.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const resumen = await app
      .get(ImportadorTodoistService)
      .importar(proyectoId, seco, cara, deFases, proyectoGrafo);
    console.log(JSON.stringify(resumen, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
