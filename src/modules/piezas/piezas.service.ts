import { TIPO_NODO } from '../../common/constants/tipos.constants.js';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cara, EstadoNodo, Nodo } from '@prisma/client';
import { ValidationError } from '../../common/exceptions/index.js';
import { alrededorDePieza, esCarril, piezaDe } from './pieza.js';
import type { NodoPlan } from './plan.js';
import { ProyectoPorDefectoService } from '../nodos/proyecto-por-defecto.service.js';
import { CreatePiezaDto } from './dto/index.js';
import { PiezasRepository } from './piezas.repository.js';

/** Las piezas que entran por el contrato del tablero (el adaptador, con `borrador`). */
export const ORIGEN_TABLERO = 'tablero';

const SIN_CABECERA =
  'No es una pieza: la descripción tiene que empezar con la cabecera del reparto, «# N.M · <título>  HU <n> · task …»';
const noEsCarril = (carril: string) =>
  `«${carril}» no es un carril: se llaman «<letra> · <zona>», como «C · Recepción»`;

@Injectable()
export class PiezasService {
  constructor(
    private readonly repository: PiezasRepository,
    private readonly proyectoPorDefecto: ProyectoPorDefectoService,
  ) {}

  /** Una pieza en la cara PLAN de su HU, con la regla de `pieza.ts`: su ronda, su HU y su carril. */
  async crear({ carril, titulo, descripcion }: CreatePiezaDto): Promise<Nodo> {
    const pieza = piezaDe(titulo, descripcion);
    if (!pieza) throw new ValidationError(SIN_CABECERA);
    if (!esCarril(carril)) throw new ValidationError(noEsCarril(carril));
    const externoId = randomUUID();
    const nodoPieza: NodoPlan = {
      externoId,
      tipo: TIPO_NODO.TAREA,
      titulo,
      descripcion,
      estado: EstadoNodo.ABIERTO,
      color: null,
      etapa: null,
      etiquetas: pieza.etiquetas,
      prioridad: null,
      vence: null,
      cara: Cara.PLAN,
    };
    const { nodos, conexiones } = alrededorDePieza(externoId, pieza, carril);
    const { proyectoId } = await this.proyectoPorDefecto.resolver();
    return this.repository.guardar(
      ORIGEN_TABLERO,
      nodoPieza,
      nodos,
      conexiones,
      proyectoId,
    );
  }
}
