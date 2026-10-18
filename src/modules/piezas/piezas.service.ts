import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Cara, EstadoNodo, Nodo, TipoNodo } from '@prisma/client';
import { ValidationError } from '../../common/exceptions/index.js';
import {
  alrededorDePieza,
  esCarril,
  piezaDe,
} from '../../importadores/pieza.js';
import type { NodoPlan } from '../../importadores/plan.js';
import { CreatePiezaDto } from './dto/index.js';
import { PiezasRepository } from './piezas.repository.js';

/** Las piezas que entran por el contrato del tablero (el adaptador, con `borrador`) y no por un importador. */
export const ORIGEN_TABLERO = 'tablero';

const SIN_CABECERA =
  'No es una pieza: la descripción tiene que empezar con la cabecera del reparto, «# N.M · <título>  HU <n> · task …»';
const noEsCarril = (carril: string) =>
  `«${carril}» no es un carril: se llaman «<letra> · <zona>», como «C · Recepción»`;

@Injectable()
export class PiezasService {
  constructor(private readonly repository: PiezasRepository) {}

  /** Una pieza en la cara PLAN de su HU, con la misma regla que el importador: su ronda, su HU y su carril. */
  crear({ carril, titulo, descripcion }: CreatePiezaDto): Promise<Nodo> {
    const pieza = piezaDe(titulo, descripcion);
    if (!pieza) throw new ValidationError(SIN_CABECERA);
    if (!esCarril(carril)) throw new ValidationError(noEsCarril(carril));
    const externoId = randomUUID();
    const nodoPieza: NodoPlan = {
      externoId,
      tipo: TipoNodo.TAREA,
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
    return this.repository.guardar(
      ORIGEN_TABLERO,
      nodoPieza,
      nodos,
      conexiones,
    );
  }
}
