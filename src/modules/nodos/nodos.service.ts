import { Injectable } from '@nestjs/common';
import { diferencias } from '../pulido/diferencias.js';
import { TipoNodo } from '@prisma/client';
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
  UpdateNodoDto,
} from './dto/index.js';
import { NodosRepository } from './nodos.repository.js';

const RECURSO = 'Nodo';

@Injectable()
export class NodosService {
  constructor(
    private readonly repository: NodosRepository,
    private readonly etapas: EtapasService,
    private readonly roles: RolesService,
  ) {}

  async findAll(query: ListarNodosDto) {
    const {
      offset,
      limit,
      tipo,
      estado,
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
    const filtro = {
      tipo,
      estado,
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
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateNodoDto) {
    const nodo = await this.findOne(id);
    this.validarColor(nodo.tipo, dto.color);
    this.etapas.validar(dto.etapa);
    // FASE 16: lo que se edita en el grafo queda en la bitácora, y el importador ya no lo pisa con lo de la fuente.
    const { motivo, ...cambios } = dto;
    return this.repository.actualizarConBitacora(
      nodo,
      cambios,
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
