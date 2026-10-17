import { PrismaService } from '../database/prisma.service.js';
import { Tx } from './aplicar-plan.js';

/** Con este error la transacción del simulacro se deshace a propósito; lleva adentro lo que contó `aplicar`. */
class SimulacroDeshecho<T> extends Error {
  constructor(readonly resultado: T) {
    super('simulacro: la transacción se deshace a propósito');
  }
}

/**
 * `--seco` de los importadores: corre `aplicar` igual que una importación real y deshace la transacción. Los números
 * salen del MISMO código que escribe, contra la base de verdad. Antes `--seco` contaba el plan entero como «nuevo»:
 * reimportar sin cambios mostraba 155 nuevos (medido 2026-10-17 contra el Mac Mini) — un chequeo que no distinguía.
 */
export async function simular<T>(
  prisma: PrismaService,
  aplicar: (tx: Tx) => Promise<T>,
): Promise<T> {
  const desenlace: unknown = await prisma
    .$transaction(async (tx) => {
      throw new SimulacroDeshecho(await aplicar(tx));
    })
    .catch((error: unknown) => error);
  if (desenlace instanceof SimulacroDeshecho) {
    return (desenlace as SimulacroDeshecho<T>).resultado;
  }
  throw desenlace;
}
