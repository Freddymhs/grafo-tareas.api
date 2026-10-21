import { Injectable } from '@nestjs/common';
import { diferencias } from '../pulido/diferencias.js';
import { Cara, TipoNodo } from '@prisma/client';
import { DerivadoService } from '../derivado/derivado.service.js';
import { EtapasService } from './etapas.service.js';
import { RolesService } from '../roles/roles.service.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/index.js';
import {
  CreateNodoDto,
  GuardarPosicionesDto,
  ListarNodosDto,
  OrdenDelDiaDto,
  UpdateNodoDto,
} from './dto/index.js';
import { NodosRepository } from './nodos.repository.js';

const RECURSO = 'Nodo';

/**
 * `vence` llega como dice el contrato, `YYYY-MM-DD`, y Prisma pide una fecha con hora: pasado tal cual, crear o editar
 * con fecha daba 500 (Freddy, 2026-10-18, la tarea de las horas extras). `null` la borra.
 */
function conVenceComoFecha<T extends { readonly vence?: string | null }>(
  dto: T,
) {
  const { vence } = dto;
  if (vence === undefined || vence === null) return dto;
  return { ...dto, vence: new Date(vence) };
}

@Injectable()
export class NodosService {
  constructor(
    private readonly repository: NodosRepository,
    private readonly etapas: EtapasService,
    private readonly roles: RolesService,
    private readonly derivado: DerivadoService,
  ) {}

  async findAll(query: ListarNodosDto) {
    const {
      offset,
      limit,
      tipo,
      estado,
      cara,
      libro,
      etapa,
      etiqueta,
      rama,
      q,
      rol,
      notas,
    } = query;
    const porRol = rol === undefined ? undefined : this.roles.filtroDe(rol);
    const sinEtiquetas =
      notas === undefined ? undefined : this.roles.etiquetasDeNotas();
    // La HU la resuelve la misma regla de las páginas de la VR (FASE 15): un tablero por HU sin otra lógica. Con
    // `libro`, la cara elige la página (la del plan trae su HU, que es real) y no filtra aparte.
    const ids =
      libro === undefined
        ? undefined
        : await this.derivado.nodosDe(libro, cara ?? Cara.REAL);
    const filtro = {
      tipo,
      estado,
      cara: libro === undefined ? cara : undefined,
      ids,
      etapa,
      etiqueta,
      rama,
      q,
      rol: porRol,
      sinEtiquetas,
    };
    const [data, total] = await Promise.all([
      this.repository.listar(filtro, offset, limit),
      this.repository.contar(filtro),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    const nodo = await this.repository.findById(id);
    if (!nodo) {
      throw new NotFoundError(RECURSO);
    }
    return nodo;
  }

  async create(dto: CreateNodoDto) {
    this.validarColor(dto.tipo, dto.color);
    this.etapas.validar(dto.etapa);
    await this.validarExterno(dto.externoOrigen, dto.externoId);
    return this.repository.create(conVenceComoFecha(dto));
  }

  async update(id: string, dto: UpdateNodoDto) {
    const nodo = await this.findOne(id);
    this.validarColor(nodo.tipo, dto.color);
    this.etapas.validar(dto.etapa);
    // FASE 16: lo que se edita en el grafo queda en la bitácora, y el importador ya no lo pisa con lo de la fuente.
    const { motivo, ...cambios } = dto;
    return this.repository.actualizarConBitacora(
      nodo,
      conVenceComoFecha(cambios),
      diferencias(nodo, cambios),
      motivo ?? null,
    );
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.remove(id);
  }

  async guardarPosiciones({ posiciones }: GuardarPosicionesDto) {
    const ids = [...new Set(posiciones.map(({ id }) => id))];
    const hayRepetidos = ids.length !== posiciones.length;
    if (hayRepetidos) {
      throw new ValidationError('Un nodo aparece más de una vez en el lote');
    }
    const existentes = await this.repository.contarExistentes(ids);
    if (existentes !== ids.length) {
      throw new NotFoundError(RECURSO);
    }
    const guardadas = await this.repository.guardarPosiciones(posiciones);
    return { guardadas };
  }

  /**
   * El orden del día (AHORA de Herdr, que Freddy ordena a mano): las tarjetas llevan `hoy:1…n` y las de otro día lo
   * pierden. Solo tarjetas: en una FASE, `importar:fases` reescribe las etiquetas y el lugar se perdería sin aviso.
   */
  async ordenarDia({ ids }: OrdenDelDiaDto) {
    const hayRepetidas = new Set(ids).size !== ids.length;
    if (hayRepetidas) {
      throw new ValidationError('Una tarjeta aparece más de una vez en el día');
    }
    const tipos = await this.repository.tiposDe(ids);
    if (tipos.length !== ids.length) {
      throw new NotFoundError(RECURSO);
    }
    const noEsTarjeta = tipos.some((tipo) => tipo !== TipoNodo.TAREA);
    if (noEsTarjeta) {
      throw new ValidationError(
        'El día se arma con tarjetas (TAREA): la FASE se ordena por su tarjeta [<id>]',
      );
    }
    const ordenadas = await this.repository.guardarOrdenDelDia(ids);
    return { ordenadas };
  }

  private validarColor(tipo: TipoNodo, color: string | undefined) {
    const esRama = tipo === TipoNodo.RAMA;
    if (color !== undefined && !esRama) {
      throw new ValidationError('Solo un nodo RAMA lleva color');
    }
  }

  /** C3: un importador reconoce el nodo por su origen + id, nunca por el título. */
  private async validarExterno(
    externoOrigen: string | undefined,
    externoId: string | undefined,
  ) {
    const vieneUno =
      (externoOrigen === undefined) !== (externoId === undefined);
    if (vieneUno) {
      throw new ValidationError('externoOrigen y externoId van juntos');
    }
    if (externoOrigen === undefined || externoId === undefined) return;
    const yaExiste = await this.repository.buscarPorExterno(
      externoOrigen,
      externoId,
    );
    if (yaExiste) {
      throw new ConflictError(
        `Ya existe el nodo ${externoOrigen}:${externoId} (${yaExiste.id})`,
      );
    }
  }
}
