// Lo único de la API que habla con Todoist, y solo LEE. REST v1, paginado por `next_cursor` (una página de más
// de 100 tareas rompía el helper de bash el 2026-10-16: acá la paginación tiene test).
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV_KEYS } from '../../config/env.constants.js';
import { ExternalAPIError } from '../../common/exceptions/index.js';
import { SeccionTodoist, TareaTodoist } from './traducir.js';

export const TODOIST_BASE_URL = 'https://api.todoist.com/api/v1';
const TAMANO_PAGINA = 200;

interface Pagina<T> {
  readonly results: readonly T[];
  readonly next_cursor: string | null;
}

export type Fetch = typeof fetch;
/** Token para inyectar fetch: un parámetro con valor por defecto Nest igual intenta resolverlo (medido 2026-10-16). */
export const FETCH = Symbol('FETCH');

@Injectable()
export class TodoistClient {
  constructor(
    private readonly config: ConfigService,
    @Inject(FETCH) private readonly http: Fetch,
  ) {}

  async tareas(proyectoId: string): Promise<TareaTodoist[]> {
    return this.paginar<TareaTodoist>('/tasks', { project_id: proyectoId });
  }

  async secciones(proyectoId: string): Promise<SeccionTodoist[]> {
    return this.paginar<SeccionTodoist>('/sections', {
      project_id: proyectoId,
    });
  }

  /** Recursivo y sin estado: cada página pide la siguiente por su next_cursor hasta que no hay más. */
  private async paginar<T>(
    ruta: string,
    filtro: Record<string, string>,
    cursor?: string,
  ): Promise<T[]> {
    const pagina = await this.pedir<Pagina<T>>(ruta, {
      ...filtro,
      limit: String(TAMANO_PAGINA),
      ...(cursor ? { cursor } : {}),
    });
    const siguientes = pagina.next_cursor
      ? await this.paginar<T>(ruta, filtro, pagina.next_cursor)
      : [];
    return [...pagina.results, ...siguientes];
  }

  private async pedir<T>(
    ruta: string,
    query: Record<string, string>,
  ): Promise<T> {
    const token = this.config.get<string>(ENV_KEYS.TODOIST_API_KEY);
    if (!token) {
      throw new ExternalAPIError(
        `Falta ${ENV_KEYS.TODOIST_API_KEY} en el entorno`,
      );
    }
    const url = `${TODOIST_BASE_URL}${ruta}?${new URLSearchParams(query).toString()}`;
    const respuesta = await this.http(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) {
      throw new ExternalAPIError(
        `Todoist ${ruta} respondió ${respuesta.status}`,
      );
    }
    return (await respuesta.json()) as T;
  }
}
