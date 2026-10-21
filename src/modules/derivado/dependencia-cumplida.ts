// Cuándo una conexión bloqueante ya no frena aunque su destino siga ABIERTO. Puro.
import { TipoConexion } from '@prisma/client';
import {
  ETAPA_MERGEADA,
  ETIQUETA_MERGEADA,
} from '../../common/constants/index.js';

/** Lo que hace falta saber del destino: su FASE lleva la etiqueta `mergeada`; su tarjeta, la columna de lo mergeado. */
export interface DestinoDeDependencia {
  readonly etiquetas: readonly string[];
  readonly etapa: string | null;
}

/**
 * Depender de algo ya mergeado está cumplido: las FASE lo escriben así («**Dependencias**: FASE 38 mergeada»), y una FASE
 * mergeada sigue ABIERTA hasta sus trámites (evidencia, wiki). La 25325 aparecía bloqueada por la 26309, mergeada el 20-10
 * (Freddy, 21-10). Lo mergeado se reconoce por la etiqueta `mergeada` (la FASE) o por estar en la columna de lo mergeado
 * (la tarjeta `[<id>]`, que el hook lleva ahí pero sin etiqueta: la 26998 seguía frenada por la tarjeta de la 25325).
 * Esperar respuesta o estar bloqueada por algo mergeado no se cumple: esas siguen frenando.
 * `BLOQUEA_AHORA` (derivado.repository.ts) es esta misma regla escrita para Prisma.
 */
export const dependenciaCumplida = (
  tipo: TipoConexion,
  { etiquetas, etapa }: DestinoDeDependencia,
) =>
  tipo === TipoConexion.DEPENDE_DE &&
  (etiquetas.includes(ETIQUETA_MERGEADA) || etapa === ETAPA_MERGEADA);
