import { Injectable } from '@nestjs/common';
import { Cara } from '@prisma/client';
import {
  CLAVE_TRAMITE,
  HORAS_DEL_PARTE,
  LIMITE_EN_CURSO,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import { NotFoundError } from '../../common/exceptions/index.js';
import { MetodoService } from '../metodo/metodo.service.js';
import { RolesService } from '../roles/roles.service.js';
import { TiposPropiedadesService } from '../tipos/tipos-propiedades.service.js';
import type { AlcanceHoyPuedo } from './derivado.repository.js';
import { calcularLibera } from './calcular-libera.js';
import { calcularFamilia } from './calcular-familia.js';
import { calcularPaginas } from './calcular-paginas.js';
import { calcularOrden } from './calcular-orden.js';
import { calcularPelotitas } from './calcular-pelotitas.js';
import { calcularUltimoCambio } from './calcular-ultimo-cambio.js';
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
    private readonly tipos: TiposPropiedadesService,
    private readonly metodos: MetodoService,
  ) {}

  /**
   * Una página por HU y «Sin HU» al final (FASE 15): qué muestra la VR en cada una. Solo lo del espacio pedido (o el
   * del proyecto por defecto): lo de otro espacio no es del método de trabajo y no cae en «Sin HU».
   */
  async paginas(espacioPedido?: string) {
    const { id: espacioId } = await this.metodos.espacioDe(espacioPedido);
    const { nodos, conexiones } = await this.repository.paraPaginas(espacioId);
    return calcularPaginas(nodos, conexiones, await this.tipos.bloqueantes());
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
  async plan(libro: string | undefined, espacioPedido?: string) {
    const { id: espacioId } = await this.metodos.espacioDe(espacioPedido);
    const delPlan = (await this.paginas(espacioId)).filter(
      (p) => p.cara === Cara.PLAN && (libro === undefined || p.libro === libro),
    );
    const ids = [...new Set(delPlan.flatMap(({ nodos }) => nodos))];
    const { nodos, conexiones } = await this.repository.paraTableroPlan(
      ids,
      espacioId,
    );
    const porId = new Map(nodos.map((nodo) => [nodo.id, nodo]));
    const carriles = calcularTableroPlan(nodos, conexiones);
    const orden = calcularOrden(carriles, conexiones);
    const pelotitas = calcularPelotitas(carriles, conexiones, orden);
    // La columna va en el orden de su línea (`calcularOrden`); a igual número, el de ronda que ya traía.
    const porOrden = (a: string, b: string) =>
      (orden.get(a) ?? 1) - (orden.get(b) ?? 1);
    return carriles.map((carril) => ({
      ...carril,
      nodos: carril.nodos.toSorted(porOrden).flatMap((id) => {
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

  /** Lo último que cambió en una página (2026-10-26): para que un cambio hecho desde otro lado no sorprenda. */
  async ultimoCambio(pagina: string) {
    const nodos =
      (await this.paginas()).find(({ id }) => id === pagina)?.nodos ?? [];
    const cambios = await this.repository.ultimosCambiosDe(nodos);
    return { ultimo: calcularUltimoCambio(cambios, nodos) };
  }

  /** Lo que la VR ilumina al seleccionar un nodo (FASE 15): él, su árbol y con qué se conecta directo. */
  async familia(id: string) {
    await this.asegurarExiste(id);
    const [enlaces, contenedoras] = await Promise.all([
      this.repository.enlaces(),
      this.tipos.contenedoras(),
    ]);
    return { ids: calcularFamilia(id, enlaces, contenedoras) };
  }

  async bloqueado(id: string) {
    await this.asegurarExiste(id);
    const por = await this.repository.bloqueadoresDe(
      id,
      await this.tipos.bloqueantes(),
    );
    return { bloqueado: por.length > 0, por };
  }

  async hoyPuedo({ proyectoId, espacioId }: AlcanceHoyPuedo) {
    const [bloqueantes, accionables] = await Promise.all([
      this.tipos.bloqueantes(),
      this.tipos.accionables(),
    ]);
    return this.repository.hoyPuedo(
      this.roles.etiquetasDeNotas(),
      bloqueantes,
      accionables,
      { proyectoId, espacioId },
    );
  }

  /** Lo de otros proyectos conectado con algo de éste: lo que la web pinta como «fantasma». */
  async vecinos(proyectoId: string) {
    const existe = await this.repository.existeProyecto(proyectoId);
    if (!existe) throw new NotFoundError('Proyecto');
    return this.repository.vecinosDe(proyectoId);
  }

  /** El parte del día (FASE 10): terminé, en curso, detenido y lo que hay para decir. */
  async dia(desdeTexto: string | undefined, espacioPedido?: string) {
    const desde = desdeTexto
      ? new Date(desdeTexto)
      : new Date(Date.now() - HORAS_DEL_PARTE * MS_POR_HORA);
    const notas = this.roles.etiquetasDeNotas();
    const bloqueantes = await this.tipos.bloqueantes();
    const { id: espacioId } = await this.metodos.espacioDe(espacioPedido);
    const [terminado, enCurso, detenido, paraDecir, tramites] =
      await Promise.all([
        this.repository.terminadas(desde, notas, espacioId),
        this.repository.enColumnas(
          this.roles.columnasEnCurso(),
          notas,
          bloqueantes,
          espacioId,
        ),
        this.repository.detenidas(notas, bloqueantes, espacioId),
        this.repository.paraDecir(espacioId),
        this.repository.abiertosConEtiqueta(
          etiquetaDeComplemento(CLAVE_TRAMITE),
          espacioId,
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
    const bloqueantes = await this.tipos.bloqueantes();
    const abajo = await this.repository.aguasAbajo(id, bloqueantes);
    const bloqueos = await this.repository.bloqueosDe(abajo, bloqueantes);
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
