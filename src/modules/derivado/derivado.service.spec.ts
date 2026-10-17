import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import { NotFoundError } from '../../common/exceptions/domain.exceptions';
import { DerivadoRepository, NodoResumen } from './derivado.repository';
import { RolesService } from '../roles/roles.service';
import { DerivadoService } from './derivado.service';

const resumen = (id: string, tipo: TipoNodo = TipoNodo.TAREA): NodoResumen => ({
  id,
  tipo,
  titulo: `Nodo ${id}`,
  estado: EstadoNodo.ABIERTO,
  color: null,
  etapa: null,
  etiquetas: [],
  prioridad: null,
  vence: null,
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
  /** Un módulo nuevo por test: sin `let` ni estado compartido entre casos (regla §0). */
  const armar = async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DerivadoService,
        { provide: DerivadoRepository, useValue: mockRepository },
        {
          provide: RolesService,
          useValue: { etiquetasDeNotas: () => ['complemento:apunte'] },
        },
      ],
    }).compile();
    return module.get(DerivadoService);
  };

  describe('bloqueado', () => {
    it('es true con al menos un bloqueador abierto, y los devuelve', async () => {
      const service = await armar();
      mockRepository.bloqueadoresDe.mockResolvedValueOnce([
        resumen('duda', TipoNodo.DUDA),
      ]);

      const resultado = await service.bloqueado('t1');

      expect(resultado.bloqueado).toBe(true);
      expect(resultado.por.map(({ id }) => id)).toEqual(['duda']);
    });

    it('404 si el nodo no existe', async () => {
      const service = await armar();
      mockRepository.existe.mockResolvedValueOnce(false);

      await expect(service.bloqueado('nada')).rejects.toThrow(NotFoundError);
    });
  });

  describe('libera', () => {
    it('cruza aguas abajo con los bloqueos vigentes y devuelve los nodos en el orden calculado', async () => {
      const service = await armar();
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
      const service = await armar();
      const resultado = await service.libera('solo');

      expect(resultado).toEqual({ directos: [], cadena: [] });
      expect(mockRepository.resumenes).toHaveBeenCalledWith([]);
    });
  });
});
