// Cuándo una conexión bloqueante ya no frena aunque su destino siga ABIERTO. Puro.
import { TipoConexion } from '@prisma/client';
import { ETIQUETA_MERGEADA } from '../../common/constants/index.js';

/**
 * Depender de algo ya mergeado está cumplido: las FASE lo escriben así («**Dependencias**: FASE 38 mergeada»), y una FASE
 * mergeada sigue ABIERTA hasta sus trámites (evidencia, wiki). La 25325 aparecía bloqueada por la 26309, mergeada el 20-10
 * (Freddy, 21-10). Esperar respuesta o estar bloqueada por ella no se cumple al mergear: esas siguen frenando.
 * `BLOQUEA_AHORA` (derivado.repository.ts) es esta misma regla escrita para Prisma.
 */
export const dependenciaCumplida = (
  tipo: TipoConexion,
  etiquetasDelDestino: readonly string[],
) =>
  tipo === TipoConexion.DEPENDE_DE &&
  etiquetasDelDestino.includes(ETIQUETA_MERGEADA);
