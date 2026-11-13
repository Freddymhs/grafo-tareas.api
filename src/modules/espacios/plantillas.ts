import { TIPO_NODO } from '../../common/constants/index.js';

export type NombrePlantilla = 'empresa' | 'maquinas' | 'conocimiento' | 'vacia';

interface TipoDePlantilla {
  readonly nombre: string;
  readonly tieneCiclo: boolean;
  readonly accionable: boolean;
}

interface Plantilla {
  readonly tiposNodo: readonly TipoDePlantilla[];
  readonly etapas: readonly string[];
}

const conCiclo = (nombre: string, accionable = false): TipoDePlantilla => ({
  nombre,
  tieneCiclo: true,
  accionable,
});
const sinCiclo = (nombre: string): TipoDePlantilla => ({
  nombre,
  tieneCiclo: false,
  accionable: false,
});

export const PLANTILLAS: Readonly<Record<NombrePlantilla, Plantilla>> = {
  empresa: {
    tiposNodo: [
      conCiclo(TIPO_NODO.TAREA, true),
      conCiclo(TIPO_NODO.DUDA),
      conCiclo(TIPO_NODO.PERSONA),
    ],
    etapas: ['Pendiente', 'Haciendo', 'Hecho'],
  },
  maquinas: {
    tiposNodo: [
      sinCiclo('MAQUINA'),
      sinCiclo('FAMILIA'),
      sinCiclo('HERRAMIENTA'),
    ],
    etapas: [],
  },
  conocimiento: {
    tiposNodo: [sinCiclo('CONCEPTO'), sinCiclo('IDEA')],
    etapas: [],
  },
  vacia: { tiposNodo: [], etapas: [] },
};

export const NOMBRES_PLANTILLAS = Object.keys(PLANTILLAS) as NombrePlantilla[];
