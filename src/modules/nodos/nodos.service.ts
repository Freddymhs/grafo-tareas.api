import { TIPO_NODO } from '../../common/constants/tipos.constants.js';
import { Injectable } from '@nestjs/common';
import { diferencias } from '../pulido/diferencias.js';
import { Cara, EstadoNodo, type Nodo } from '@prisma/client';
import { DerivadoService } from '../derivado/derivado.service.js';
import { EtapasDelEspacioService } from './etapas-del-espacio.service.js';
import { RolesService } from '../roles/roles.service.js';
import { ProyectoPorDefectoService } from './proyecto-por-defecto.service.js';
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
    private readonly etapas: EtapasDelEspacioService,
    private readonly roles: RolesService,
    private readonly derivado: DerivadoService,
    private readonly proyectoPorDefecto: ProyectoPorDefectoService,
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
      proyecto,
      espacio,
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
      proyectoId: proyecto,
      espacioId: espacio,
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
    await this.validarExterno(dto.externoOrigen, dto.externoId);
    const { proyectoId } = await this.proyectoPorDefecto.resolver(
      dto.proyectoId,
    );
    const tipo = await this.tipoDelProyecto(proyectoId, dto.tipo);
    await this.etapas.validar(dto.etapa, tipo.espacioId);
    const estado = tipo.tieneCiclo ? (dto.estado ?? EstadoNodo.ABIERTO) : null;
    return this.repository.create({
      ...conVenceComoFecha(dto),
      proyectoId,
      estado,
    });
  }

  async update(id: string, dto: UpdateNodoDto) {
    const nodo = await this.findOne(id);
    this.validarColor(nodo.tipo, dto.color);
    // FASE 16: lo que se edita en el grafo queda en la bitácora, y el importador ya no lo pisa con lo de la fuente.
    const { motivo, ...pedido } = dto;
    const cambios = await this.conEstadoDelTipo(nodo, pedido);
    await this.etapas.validar(
      dto.etapa,
      await this.espacioDelNodo(nodo, dto.proyectoId),
    );
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
   * El tipo manda sobre el estado: sin ciclo, el nodo no lo tiene (se ignora lo que mande el cliente); con ciclo, pedir
   * `null` es un 400. Al mover a otro proyecto el tipo tiene que existir en su espacio (409), y un nodo que venía sin
   * estado y ahora lo tiene nace ABIERTO.
   */
  private async conEstadoDelTipo(
    nodo: Nodo,
    pedido: Omit<UpdateNodoDto, 'motivo'>,
  ) {
    const mueve =
      pedido.proyectoId !== undefined && pedido.proyectoId !== nodo.proyectoId;
    const destino = mueve ? pedido.proyectoId : nodo.proyectoId;
    if (destino === undefined || destino === null) return pedido;
    const tipo = await this.tipoDelProyecto(destino, nodo.tipo, mueve);
    if (!tipo.tieneCiclo) return { ...pedido, estado: null };
    if (pedido.estado === null) {
      throw new ValidationError(
        `el tipo «${nodo.tipo}» tiene ciclo: su estado es ABIERTO o CERRADO, no null`,
      );
    }
    const nacia = mueve && nodo.estado === null && pedido.estado === undefined;
    return nacia ? { ...pedido, estado: EstadoNodo.ABIERTO } : pedido;
  }

  private async espacioDelNodo(
    nodo: Nodo,
    proyectoPedido: string | undefined,
  ): Promise<string | undefined> {
    const proyectoId = proyectoPedido ?? nodo.proyectoId;
    if (proyectoId === null) return undefined;
    const proyecto = await this.repository.proyectoConEspacio(proyectoId);
    return proyecto?.espacio.id;
  }

  /** El tipo del nodo tiene que existir en el espacio del proyecto: 400 al crear, 409 al mover. */
  private async tipoDelProyecto(
    proyectoId: string,
    tipo: string,
    alMover = false,
  ) {
    const proyecto = await this.repository.proyectoConEspacio(proyectoId);
    if (!proyecto) throw new NotFoundError('Proyecto');
    const { espacio } = proyecto;
    const definido = await this.repository.tipoEnEspacio(espacio.id, tipo);
    if (definido) return definido;
    const mensaje = `tipo «${tipo}» no existe en el espacio «${espacio.nombre}»`;
    throw alMover ? new ConflictError(mensaje) : new ValidationError(mensaje);
  }

  private validarColor(tipo: string, color: string | undefined) {
    const esRama = tipo === TIPO_NODO.RAMA;
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
