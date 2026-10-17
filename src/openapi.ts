// Escribe `openapi.json`, el contrato que consumen la PWA y la VR por Orval (concepto § Stack, Contrato).
// Se corre con `pnpm openapi:export`; el CI falla si el archivo quedó desactualizado respecto al código.
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SWAGGER_CONFIG } from './config/swagger';

const SALIDA = 'openapi.json';
const SANGRIA = 2;

async function exportar() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  app.setGlobalPrefix('api/v1');
  const documento = SwaggerModule.createDocument(app, SWAGGER_CONFIG);
  writeFileSync(SALIDA, JSON.stringify(documento, null, SANGRIA) + '\n');
  await app.close();
  console.log(`${SALIDA}: ${Object.keys(documento.paths).length} rutas`);
}

void exportar();
