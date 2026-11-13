import { ConfigService } from '@nestjs/config';
import { ENV_KEYS } from '../../config/env.constants.js';
import { ValidationError } from '../../common/exceptions/index.js';
import type { BusquedaDeProyecto } from './proyecto-por-defecto.repository';
import { ProyectoPorDefectoService } from './proyecto-por-defecto.service';

const ID_SAG = '11111111-1111-4111-8111-111111111111';
const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const repoConSag = (existentes: readonly string[]): BusquedaDeProyecto => ({
  existe: (id) => Promise.resolve(existentes.includes(id)),
  delMetodo: () => Promise.resolve({ id: ID_SAG }),
});
const repoSinNada: BusquedaDeProyecto = {
  existe: () => Promise.resolve(false),
  delMetodo: () => Promise.resolve(null),
};

const armar = (repository: BusquedaDeProyecto, deEntorno?: string) =>
  new ProyectoPorDefectoService(
    new ConfigService({ [ENV_KEYS.PROYECTO_POR_DEFECTO]: deEntorno }),
    repository,
  );

describe('ProyectoPorDefectoService', () => {
  it('sin variable de entorno y con un SAG en el espacio del método → el SAG, por defecto', async () => {
    const service = armar(repoConSag([ID_SAG]));
    await expect(service.resolver()).resolves.toEqual({
      proyectoId: ID_SAG,
      porDefecto: true,
    });
  });

  it('con la variable apuntando a un id inexistente → cae al SAG', async () => {
    const service = armar(repoConSag([ID_SAG]), ID_INEXISTENTE);
    await expect(service.resolver()).resolves.toEqual({
      proyectoId: ID_SAG,
      porDefecto: true,
    });
  });

  it('sin variable ni SAG → 400', async () => {
    const service = armar(repoSinNada);
    await expect(service.resolver()).rejects.toThrow(ValidationError);
  });
});
