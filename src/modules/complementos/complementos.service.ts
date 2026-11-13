import { TIPO_NODO } from '../../common/constants/tipos.constants.js';
import { Injectable } from '@nestjs/common';
import { EstadoNodo, Nodo } from '@prisma/client';
import {
  CLAVE_DECISION,
  METODO_TRABAJO_HU,
  PREFIJO_COMPLEMENTO,
  etiquetaDeComplemento,
} from '../../common/constants/index.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/index.js';
import { AreaService } from '../area/area.service.js';
import { MetodoService } from '../metodo/metodo.service.js';
import { RolesService } from '../roles/roles.service.js';
import type { Complemento } from '../roles/roles.types.js';
import { ComplementosRepository } from './complementos.repository.js';
import { CreateComplementoDto, DecidirDto, EscalarDto } from './dto/index.js';

const RECURSO = 'Nodo';
/** La fecha local (AAAA-MM-DD) de la máquina de la API: en UTC, después de las ~21 h de Chile el rastro decía mañana. */
const FORMATO_FECHA_ISO = 'sv-SE';
const hoy = () => new Date().toLocaleDateString(FORMATO_FECHA_ISO);

const claveDe = ({ etiquetas }: Nodo) =>
  etiquetas
    .find((etiqueta) => etiqueta.startsWith(PREFIJO_COMPLEMENTO))
    ?.slice(PREFIJO_COMPLEMENTO.length) ?? '';

/** Lo que cuelga de un PBI (C11, FASE 9): el catálogo es el de roles.yaml; escaleras y rituales, los de refs.yaml. */
@Injectable()
export class ComplementosService {
  constructor(
    private readonly repository: ComplementosRepository,
    private readonly roles: RolesService,
    private readonly area: AreaService,
    private readonly metodos: MetodoService,
  ) {}

  async crear(padreId: string, dto: CreateComplementoDto) {
    const { tipo, titulo, descripcion, ritual, personaId, prioridad } = dto;
    const complemento = this.roles.complemento(tipo);
    const esParaUnRitual = complemento.nodo === TIPO_NODO.DAILY_ITEM;
    if (!esParaUnRitual && ritual !== undefined) {
      throw new ValidationError(
        `"${tipo}" no se dice en un ritual: "ritual" solo va con un complemento DAILY_ITEM`,
      );
    }
    if (esParaUnRitual && ritual === undefined) {
      throw new ValidationError(
        `"${tipo}" se dice en un ritual: falta "ritual" (GET /area)`,
      );
    }
    const padre = await this.buscar(padreId);
    // El guard del controlador mira el espacio por defecto: el que importa es el del nodo del que se cuelga.
    await this.metodos.exigirDelProyecto(METODO_TRABAJO_HU, padre.proyectoId);
    const persona = personaId ? await this.buscarPersona(personaId) : null;
    const nodo = await this.repository.crear({
      padreId,
      // La cara del dueño: así el dato dice lo mismo que la página donde se muestra (la de su PERTENECE_A).
      cara: padre.cara,
      prioridad: prioridad ?? null,
      personaId: persona?.id ?? null,
      tipo: complemento.nodo,
      titulo,
      descripcion: descripcion ?? null,
      etiqueta: etiquetaDeComplemento(complemento.clave),
      frenaAlPadre: complemento.nodo === TIPO_NODO.DUDA,
      ritual:
        esParaUnRitual && ritual !== undefined
          ? this.area.ritual(ritual)
          : null,
    });
    return { ...nodo, complemento: complemento.clave };
  }

  async deUnNodo(padreId: string) {
    await this.buscar(padreId);
    const nodos = await this.repository.deUnNodo(
      padreId,
      this.roles.etiquetasDeComplementos(),
    );
    return nodos.map((nodo) => ({ ...nodo, complemento: claveDe(nodo) }));
  }

  /** La duda pasa a esperar al siguiente de su escalera (o a `persona`); el rastro queda en su descripción. */
  async escalar(id: string, { persona }: EscalarDto) {
    const { duda, complemento } = await this.dudaAbierta(id);
    if (complemento.escalera === null) {
      throw new ValidationError(
        `"${complemento.clave}" no tiene escalera en el catálogo`,
      );
    }
    const escalera = this.area.escalera(complemento.escalera);
    const anterior = await this.repository.esperaDe(id);
    const posicion = anterior
      ? escalera.personas.indexOf(anterior.persona)
      : -1;
    const siguiente = persona ?? escalera.personas[posicion + 1];
    if (siguiente === undefined) {
      throw new ConflictError(
        `La duda ya llegó al final de la escalera ${escalera.clave} (${anterior?.persona ?? '—'}): no hay a quién más`,
      );
    }
    if (siguiente === anterior?.persona) {
      throw new ConflictError(`La duda ya espera a ${siguiente}`);
    }
    const primerPaso = anterior === null && escalera.antes !== null;
    const rastro = [
      `- ${hoy()} · escalada a ${siguiente}`,
      anterior ? ` (antes: ${anterior.persona})` : '',
      primerPaso ? ` · ya hecho: ${escalera.antes}` : '',
    ].join('');
    const actualizada = await this.repository.escalar(
      duda,
      siguiente,
      anterior,
      rastro,
    );
    return { ...actualizada, complemento: complemento.clave };
  }

  /** Cerrar una duda con su respuesta: la duda queda cerrada (no se borra) y la decisión, colgada de ella. */
  async decidir(id: string, { quien, donde, texto }: DecidirDto) {
    const { duda } = await this.dudaAbierta(id);
    const decision = this.roles.complemento(CLAVE_DECISION);
    const nodo = await this.repository.decidir(duda, {
      titulo: texto,
      descripcion: [
        `Duda: ${duda.titulo}`,
        `Contestó: ${quien}`,
        `Dónde quedó: ${donde}`,
        `Fecha: ${hoy()}`,
      ].join('\n'),
      etiqueta: etiquetaDeComplemento(decision.clave),
    });
    return { ...nodo, complemento: decision.clave };
  }

  private async dudaAbierta(
    id: string,
  ): Promise<{ duda: Nodo; complemento: Complemento }> {
    const duda = await this.buscar(id);
    await this.metodos.exigirDelProyecto(METODO_TRABAJO_HU, duda.proyectoId);
    if (duda.tipo !== TIPO_NODO.DUDA || !claveDe(duda)) {
      throw new ValidationError(
        'Solo una duda colgada como complemento se escala o se decide',
      );
    }
    if (duda.estado !== EstadoNodo.ABIERTO) {
      throw new ConflictError('La duda ya está cerrada');
    }
    return { duda, complemento: this.roles.complemento(claveDe(duda)) };
  }

  private async buscar(id: string): Promise<Nodo> {
    const nodo = await this.repository.buscar(id);
    if (!nodo) throw new NotFoundError(RECURSO);
    return nodo;
  }

  /** A quién espera un bloqueante: tiene que ser una PERSONA del grafo. */
  private async buscarPersona(id: string): Promise<Nodo> {
    const persona = await this.buscar(id);
    if (persona.tipo !== TIPO_NODO.PERSONA) {
      throw new ValidationError(
        '"personaId" tiene que ser una PERSONA del grafo',
      );
    }
    return persona;
  }
}
