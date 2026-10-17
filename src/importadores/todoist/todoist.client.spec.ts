import { ConfigService } from '@nestjs/config';
import { ExternalAPIError } from '../../common/exceptions/domain.exceptions';
import { Fetch, TODOIST_BASE_URL, TodoistClient } from './todoist.client';

const TOKEN = 'token-de-prueba';

/** fetch acepta string, URL o Request: para comparar, siempre el texto. */
const aTexto = (entrada: Parameters<Fetch>[0]) =>
  typeof entrada === 'string'
    ? entrada
    : entrada instanceof URL
      ? entrada.href
      : entrada.url;

const config = (token: string | undefined) =>
  ({ get: () => token }) as unknown as ConfigService;

const respuesta = (cuerpo: unknown, status = 200): Response =>
  ({
    ok: status < 400,
    status,
    json: () => Promise.resolve(cuerpo),
  }) as unknown as Response;

describe('TodoistClient', () => {
  it('sigue el next_cursor hasta el final y junta todas las páginas (el bug del 2026-10-16)', async () => {
    const llamadas: string[] = [];
    const http: Fetch = (url) => {
      llamadas.push(aTexto(url));
      const pagina = aTexto(url).includes('cursor=c2')
        ? { results: [{ id: 'e' }], next_cursor: null }
        : aTexto(url).includes('cursor=c1')
          ? { results: [{ id: 'c' }, { id: 'd' }], next_cursor: 'c2' }
          : { results: [{ id: 'a' }, { id: 'b' }], next_cursor: 'c1' };
      return Promise.resolve(respuesta(pagina));
    };

    const tareas = await new TodoistClient(config(TOKEN), http).tareas('P1');

    expect(tareas.map(({ id }) => id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(llamadas).toHaveLength(3);
    expect(llamadas[0]).toBe(
      `${TODOIST_BASE_URL}/tasks?project_id=P1&limit=200`,
    );
    expect(llamadas[1]).toContain('cursor=c1');
  });

  it('manda el token como Bearer y solo hace GET', async () => {
    const http = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>(() =>
      Promise.resolve(respuesta({ results: [], next_cursor: null })),
    );

    await new TodoistClient(config(TOKEN), http).secciones('P1');

    const [, init] = http.mock.calls[0];
    expect(init?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(init?.method).toBeUndefined();
  });

  it('sin token no llama a Todoist y lo dice', async () => {
    const http = jest.fn<ReturnType<Fetch>, Parameters<Fetch>>();

    await expect(
      new TodoistClient(config(undefined), http).tareas('P1'),
    ).rejects.toThrow(ExternalAPIError);
    expect(http).not.toHaveBeenCalled();
  });

  it('un status de error se reporta con la ruta y el código', async () => {
    const http: Fetch = () => Promise.resolve(respuesta({}, 401));

    await expect(
      new TodoistClient(config(TOKEN), http).tareas('P1'),
    ).rejects.toThrow('Todoist /tasks respondió 401');
  });
});
