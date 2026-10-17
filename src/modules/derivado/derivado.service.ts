import { Injectable } from '@nestjs/common';
import {
  CLAVE_TRAMITE,
  HORAS_DEL_PARTE,
  LIMITE_EN_CURSO,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import { NotFoundError } from '../../common/exceptions/index.js';
import { RolesService } from '../roles/roles.service.js';
import { calcularLibera } from './calcular-libera.js';
import {
  Bloqueo,
  DerivadoRepository,
  NodoResumen,
} from './derivado.repository.js';

const MS_POR_HORA = 60 * 60 * 1000;

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

  /** El parte del día (FASE 10): terminé, en curso, detenido y lo que hay para decir. */
  async dia(desdeTexto: string | undefined) {
    const desde = desdeTexto
      ? new Date(desdeTexto)
      : new Date(Date.now() - HORAS_DEL_PARTE * MS_POR_HORA);
    const notas = this.roles.etiquetasDeNotas();
    const [terminado, enCurso, detenido, paraDecir, tramites] =
      await Promise.all([
        this.repository.terminadas(desde, notas),
        this.repository.enColumnas(this.roles.columnasEnCurso(), notas),
        this.repository.detenidas(notas),
        this.repository.paraDecir(),
        this.repository.abiertosConEtiqueta(
          etiquetaDeComplemento(CLAVE_TRAMITE),
        ),
      ]);
    return {
      desde,
      limiteEnCurso: LIMITE_EN_CURSO,
      terminado,
      enCurso,
      detenido,
      paraDecir,
      tramites,
    };
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
