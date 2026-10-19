import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../common/exceptions/index.js';
import { calcularContraste } from './contraste.js';
import { PulidoRepository } from './pulido.repository.js';

/**
 * El pulido del grafo (FASE 16): Freddy limpia en el grafo, nunca en Todoist. Nada se borra de verdad: se descarta
 * (archivado entero, se puede deshacer) y cada cambio queda en la bitácora con su motivo, para el contraste final.
 */
@Injectable()
export class PulidoService {
  constructor(private readonly repository: PulidoRepository) {}

  async descartar(nodoId: string, motivo: string) {
    const hecho = await this.repository.descartar(nodoId, motivo);
    if (!hecho) throw new NotFoundError('Nodo');
    const { descarte, conexiones } = hecho;
    return {
      nodoId: descarte.nodoId,
      titulo: descarte.titulo,
      motivo: descarte.motivo,
      conexionesArchivadas: conexiones,
    };
  }

  async restaurar(nodoId: string, motivo: string | null) {
    const hecho = await this.repository.restaurar(nodoId, motivo);
    if (!hecho) throw new NotFoundError('Descarte');
    const { nodo, conexionesRecuperadas, conexionesPerdidas } = hecho;
    return {
      nodoId: nodo.id,
      titulo: nodo.titulo,
      conexionesRecuperadas,
      conexionesPerdidas,
    };
  }

  descartes() {
    return this.repository.descartes();
  }

  cambios() {
    return this.repository.cambios();
  }

  async cambiosDe(nodoId: string) {
    const bitacora = await this.repository.cambiosDe(nodoId);
    if (!bitacora) throw new NotFoundError('Nodo');
    return bitacora;
  }

  async contraste() {
    const { nodos, descartes, bitacora } =
      await this.repository.paraContraste();
    return calcularContraste(nodos, descartes, bitacora);
  }
}
