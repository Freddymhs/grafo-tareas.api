import { Injectable } from '@nestjs/common';
import { Cara } from '@prisma/client';
import {
  CLAVE_TRAMITE,
  HORAS_DEL_PARTE,
  LIMITE_EN_CURSO,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import { NotFoundError } from '../../common/exceptions/index.js';
import { RolesService } from '../roles/roles.service.js';
import { calcularLibera } from './calcular-libera.js';
import { calcularFamilia } from './calcular-familia.js';
import { calcularPaginas } from './calcular-paginas.js';
import { calcularOrden } from './calcular-orden.js';
import { calcularPelotitas } from './calcular-pelotitas.js';
import { calcularTableroPlan } from './calcular-tablero-plan.js';
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

  /** Una página por HU y «Sin HU» al final (FASE 15): qué muestra la VR en cada una. */
  async paginas() {
    const { nodos, conexiones } = await this.repository.paraPaginas();
    return calcularPaginas(nodos, conexiones);
  }

  /** Los nodos de una cara de un libro (la página que muestra la VR): con ellos la web filtra el tablero por HU. */
  async nodosDe(libro: string, cara: Cara): Promise<readonly string[]> {
    const pagina = (await this.paginas()).find(
      (p) => p.libro === libro && p.cara === cara,
    );
    return pagina?.nodos ?? [];
  }

  /**
   * El tablero del plan (FASE 17): una columna por carril con sus piezas abiertas en orden de ronda. Sin `libro`, el plan
   * de todas las HU.
   */
  async plan(libro: string | undefined) {
    const delPlan = (await this.paginas()).filter(
      (p) => p.cara === Cara.PLAN && (libro === undefined || p.libro === libro),
    );
    const ids = [...new Set(delPlan.flatMap(({ nodos }) => nodos))];
    const { nodos, conexiones } = await this.repository.paraTableroPlan(ids);
    const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
    const carriles = calcularTableroPlan(nodos, conexiones);
    const pelotitas = calcularPelotitas(carriles, conexiones);
    const orden = calcularOrden(carriles, conexiones);
    return carriles.map((carril) => ({
      ...carril,
      nodos: carril.nodos.flatMap((id) => {
        const nodo = porId.get(id);
        return nodo
          ? [
              {
                ...nodo,
                orden: orden.get(id) ?? 1,
                pelotitas: pelotitas.get(id) ?? [],
              },
            ]
          : [];
      }),
    }));
  }

  /** Lo que la VR ilumina al seleccionar un nodo (FASE 15): él, su árbol y con qué se conecta directo. */
  async familia(id: string) {
    await this.asegurarExiste(id);
    return { ids: calcularFamilia(id, await this.repository.enlaces()) };
  }

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
