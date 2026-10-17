import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../common/exceptions/index.js';
import { RolesService } from '../roles/roles.service.js';
import { calcularLibera } from './calcular-libera.js';
import {
  Bloqueo,
  DerivadoRepository,
  NodoResumen,
} from './derivado.repository.js';

function agruparPorOrigen(bloqueos: readonly Bloqueo[]): Map<string, string[]> {
  const porOrigen = new Map<string, string[]>();
  bloqueos.forEach(({ origenId, destinoId }) => {
    porOrigen.set(origenId, [...(porOrigen.get(origenId) ?? []), destinoId]);
  });
  return porOrigen;
}

@Injectable()
export class DerivadoService {
  constructor(
    private readonly repository: DerivadoRepository,
    private readonly roles: RolesService,
  ) {}

  async bloqueado(id: string) {
    await this.asegurarExiste(id);
    const por = await this.repository.bloqueadoresDe(id);
    return { bloqueado: por.length > 0, por };
  }

  async hoyPuedo() {
    return this.repository.hoyPuedo(this.roles.etiquetasDeNotas());
  }

  async libera(id: string) {
    await this.asegurarExiste(id);
    const abajo = await this.repository.aguasAbajo(id);
    const bloqueos = await this.repository.bloqueosDe(abajo);
    const { directos, cadena } = calcularLibera(id, agruparPorOrigen(bloqueos));
    const resumenes = await this.repository.resumenes([...directos, ...cadena]);
    const porId = new Map(resumenes.map((nodo) => [nodo.id, nodo]));
    const enOrden = (ids: readonly string[]): NodoResumen[] =>
      ids.flatMap((nodoId) => porId.get(nodoId) ?? []);
    return { directos: enOrden(directos), cadena: enOrden(cadena) };
  }

  private async asegurarExiste(id: string) {
    const existe = await this.repository.existe(id);
    if (!existe) {
      throw new NotFoundError('Nodo');
    }
  }
}
