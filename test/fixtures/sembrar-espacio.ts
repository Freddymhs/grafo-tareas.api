import {
  METODO_TRABAJO_HU,
  NOMBRE_PROYECTO_GENERAL,
  NOMBRE_PROYECTO_POR_DEFECTO,
  TIPO_CONEXION,
  TIPO_NODO,
} from '../../src/common/constants/tipos.constants';
import { ETAPAS_POR_DEFECTO } from '../../src/common/constants/grafo.constants';
import { PrismaService } from '../../src/database/prisma.service';

const NOMBRE_ESPACIO_TRABAJO = 'SIGSA';
const TIPOS_CON_CICLO_ACCIONABLE: readonly string[] = [TIPO_NODO.TAREA];

const TIPOS_CONEXION_SEMBRADOS = [
  { nombre: TIPO_CONEXION.DEPENDE_DE, bloquea: true },
  { nombre: TIPO_CONEXION.ESPERA_RESPUESTA_DE, bloquea: true },
  { nombre: TIPO_CONEXION.BLOQUEADA_POR, bloquea: true },
  { nombre: TIPO_CONEXION.PERTENECE_A, contiene: true },
  { nombre: TIPO_CONEXION.EN_DAILY_DE },
  { nombre: TIPO_CONEXION.SE_RELACIONA_CON, simetrica: true },
  { nombre: TIPO_CONEXION.DERIVA_DE },
] as const;

export interface EspacioSembrado {
  espacioId: string;
  proyectoSagId: string;
  proyectoGeneralId: string;
}

/** Hijos → padres: las conexiones y los nodos antes que los proyectos, los espacios y los tipos. */
export async function vaciarBase(prisma: PrismaService): Promise<void> {
  await prisma.conexion.deleteMany();
  await prisma.nodo.deleteMany();
  await prisma.descarte.deleteMany();
  await prisma.cambio.deleteMany();
  await prisma.tipoNodo.deleteMany();
  await prisma.proyecto.deleteMany();
  await prisma.espacio.deleteMany();
  await prisma.tipoConexion.deleteMany();
}

/** Lo mismo que deja la migración de datos `espacios_datos`: los e2e vacían la base y la siembra se pierde. */
export async function sembrarEspacioTrabajo(
  prisma: PrismaService,
): Promise<EspacioSembrado> {
  await prisma.tipoConexion.createMany({
    data: TIPOS_CONEXION_SEMBRADOS.map((tipo) => ({ ...tipo })),
  });
  const espacio = await prisma.espacio.create({
    data: {
      nombre: NOMBRE_ESPACIO_TRABAJO,
      metodo: METODO_TRABAJO_HU,
      etapas: [...ETAPAS_POR_DEFECTO],
    },
  });
  const proyectoSag = await prisma.proyecto.create({
    data: {
      espacioId: espacio.id,
      nombre: NOMBRE_PROYECTO_POR_DEFECTO,
      orden: 0,
    },
  });
  const proyectoGeneral = await prisma.proyecto.create({
    data: {
      espacioId: espacio.id,
      nombre: NOMBRE_PROYECTO_GENERAL,
      orden: 1,
    },
  });
  await prisma.tipoNodo.createMany({
    data: Object.values(TIPO_NODO).map((nombre) => ({
      espacioId: espacio.id,
      nombre,
      tieneCiclo: true,
      accionable: TIPOS_CON_CICLO_ACCIONABLE.includes(nombre),
    })),
  });
  return {
    espacioId: espacio.id,
    proyectoSagId: proyectoSag.id,
    proyectoGeneralId: proyectoGeneral.id,
  };
}
