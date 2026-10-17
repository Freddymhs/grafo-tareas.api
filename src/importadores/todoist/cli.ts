// `pnpm importar:todoist -- --proyecto <id> [--seco]` — la migración de Todoist al grafo (FASE 3).
// Corre desde `dist` (los alias `.js` no los resuelve ts-node). `--seco` traduce y cuenta sin escribir.
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ImportadorTodoistService } from './importador-todoist.service';

const USO = 'uso: importar:todoist -- --proyecto <id-de-todoist> [--seco]';
const EXIT_USO = 64;

function leerArgumentos(argv: readonly string[]) {
  const indice = argv.indexOf('--proyecto');
  const proyectoId = indice >= 0 ? argv[indice + 1] : undefined;
  if (!proyectoId || proyectoId.startsWith('--')) {
    console.error(USO);
    process.exit(EXIT_USO);
  }
  return { proyectoId, seco: argv.includes('--seco') };
}

async function main() {
  const { proyectoId, seco } = leerArgumentos(process.argv.slice(2));
  // abortOnError: false — con el logger apagado, Nest abortaría en silencio y el error nunca se vería.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
    abortOnError: false,
  });
  try {
    const resumen = await app
      .get(ImportadorTodoistService)
      .importar(proyectoId, seco);
    console.log(JSON.stringify(resumen, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
