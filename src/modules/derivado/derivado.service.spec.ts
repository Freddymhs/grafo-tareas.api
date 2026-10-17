import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import { NotFoundError } from '../../common/exceptions/domain.exceptions';
import { DerivadoRepository, NodoResumen } from './derivado.repository';
import { DerivadoService } from './derivado.service';

const resumen = (id: string, tipo: TipoNodo = TipoNodo.TAREA): NodoResumen => ({
  id,
  tipo,
  titulo: `Nodo ${id}`,
  estado: EstadoNodo.ABIERTO,
  color: null,
});

const mockRepository = {
  existe: jest.fn().mockResolvedValue(true),
  bloqueadoresDe: jest.fn().mockResolvedValue([]),
  hoyPuedo: jest.fn().mockResolvedValue([]),
  aguasAbajo: jest.fn().mockResolvedValue([]),
  bloqueosDe: jest.fn().mockResolvedValue([]),
  resumenes: jest.fn().mockResolvedValue([]),
};

describe('DerivadoService', () => {
  let service: DerivadoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DerivadoService,
        { provide: DerivadoRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get(DerivadoService);
    jest.clearAllMocks();
  });

  describe('bloqueado', () => {
    it('es true con al menos un bloqueador abierto, y los devuelve', async () => {
      mockRepository.bloqueadoresDe.mockResolvedValueOnce([
        resumen('duda', TipoNodo.DUDA),
      ]);

      const resultado = await service.bloqueado('t1');

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.por.map(({ id }) => id)).toEqual(['duda']);
    });

    it('404 si el nodo no existe', async () => {
      mockRepository.existe.mockResolvedValueOnce(false);

      await expect(service.bloqueado('nada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('libera', () => {
    it('cruza aguas abajo con los bloqueos vigentes y devuelve los nodos en el orden calculado', async () => {
      mockRepository.aguasAbajo.mockResolvedValueOnce(['duda', 't1', 't2']);
      mockRepository.bloqueosDe.mockResolvedValueOnce([
        { origenId: 'duda', destinoId: 'tomas' },
        { origenId: 't1', destinoId: 'duda' },
        { origenId: 't2', destinoId: 'duda' },
        { origenId: 't2', destinoId: 'otra' },
      ]);
      mockRepository.resumenes.mockResolvedValueOnce([
        resumen('t1'),
        resumen('duda', TipoNodo.DUDA),
      ]);

      const resultado = await service.libera('tomas');

      expect(mockRepository.bloqueosDe).toHaveBeenCalledWith([
        'duda',
        't1',
        't2',
      ]);
      expect(resultado.directos.map(({ id }) => id)).toEqual(['duda']);
      expect(resultado.cadena.map(({ id }) => id)).toEqual(['t1']);
    });

    it('sin nada aguas abajo no consulta resúmenes de más', async () => {
      const resultado = await service.libera('solo');

      expect(resultado).toEqual({ directos: [], cadena: [] });
      expect(mockRepository.resumenes).toHaveBeenCalledWith([]);
    });
  });
});
