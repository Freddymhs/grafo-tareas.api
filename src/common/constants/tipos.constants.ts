/** Los nombres de tipo que el método de trabajo (SIGSA) busca dentro de su espacio. El tipo en la base es texto. */
export const TIPO_NODO = {
  TAREA: 'TAREA',
  HISTORIA: 'HISTORIA',
  FASE: 'FASE',
  RAMA: 'RAMA',
  DUDA: 'DUDA',
  PERSONA: 'PERSONA',
  PR: 'PR',
  DAILY_ITEM: 'DAILY_ITEM',
} as const;

export const TIPO_CONEXION = {
  DEPENDE_DE: 'DEPENDE_DE',
  ESPERA_RESPUESTA_DE: 'ESPERA_RESPUESTA_DE',
  BLOQUEADA_POR: 'BLOQUEADA_POR',
  PERTENECE_A: 'PERTENECE_A',
  EN_DAILY_DE: 'EN_DAILY_DE',
  SE_RELACIONA_CON: 'SE_RELACIONA_CON',
  DERIVA_DE: 'DERIVA_DE',
} as const;

export type NombreTipoNodoMetodo = (typeof TIPO_NODO)[keyof typeof TIPO_NODO];
export type NombreTipoConexionMetodo =
  (typeof TIPO_CONEXION)[keyof typeof TIPO_CONEXION];

export const METODO_TRABAJO_HU = 'trabajo-hu';
export const NOMBRE_PROYECTO_GENERAL = 'General';
export const NOMBRE_PROYECTO_POR_DEFECTO = 'SAG';

/** La respuesta de `POST /nodos` sin `proyectoId` lo dice: el nodo cayó en el proyecto por defecto. */
export const HEADER_AVISO_PROYECTO = 'X-Aviso-Proyecto';
export const AVISO_PROYECTO_POR_DEFECTO = 'por-defecto';
