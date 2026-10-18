// `pnpm importar:todoist -- --proyecto <id> [--cara PLAN] [--seco]` — la migración de Todoist al grafo (FASE 3).
// Corre desde `dist` (los alias `.js` no los resuelve ts-node). `--seco` traduce y cuenta sin escribir. `--cara PLAN`:
// el proyecto es el plan de sus HU («🚀 Draft trabajo», FASE 17); sin él, sus tareas son lo real.
import { NestFactory } from '@nestjs/core';
import { Cara } from '@prisma/client';
import { AppModule } from '../../app.module';
import { ImportadorTodoistService } from './importador-todoist.service';

const USO =
  'uso: importar:todoist -- --proyecto <id-de-todoist> [--cara REAL|PLAN] [--seco]';
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
  return { proyectoId, cara: pedida, seco: argv.includes('--seco') };
}

async function main() {
  const { proyectoId, cara, seco } = leerArgumentos(process.argv.slice(2));
  // abortOnError: false — con el logger apagado, Nest abortaría en silencio y el error nunca se vería.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const resumen = await app
      .get(ImportadorTodoistService)
      .importar(proyectoId, seco, cara);
    console.log(JSON.stringify(resumen, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
