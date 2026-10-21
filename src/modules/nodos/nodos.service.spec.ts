import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/domain.exceptions';
import { EtapasService } from './etapas.service';
import { DerivadoService } from '../derivado/derivado.service';
import { RolesService } from '../roles/roles.service';
import { NodosRepository } from './nodos.repository';
import { NodosService } from './nodos.service';

const NODO = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  tipo: TipoNodo.TAREA,
  titulo: 'Tarea',
  descripcion: null,
  estado: EstadoNodo.ABIERTO,
  color: null,
  externoOrigen: null,
  externoId: null,
  posX: null,
  posY: null,
  posZ: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepository = {
  listar: jest.fn().mockResolvedValue([NODO]),
  contar: jest.fn().mockResolvedValue(1),
  findById: jest.fn().mockResolvedValue(NODO),
  create: jest.fn().mockResolvedValue(NODO),
  update: jest.fn().mockResolvedValue(NODO),
  remove: jest.fn().mockResolvedValue(NODO),
  contarExistentes: jest.fn().mockResolvedValue(1),
  buscarPorExterno: jest.fn().mockResolvedValue(null),
  guardarPosiciones: jest.fn().mockResolvedValue(1),
  tiposDe: jest.fn().mockResolvedValue([TipoNodo.TAREA]),
  guardarOrdenDelDia: jest.fn().mockResolvedValue(1),
};

const mockEtapas = { validar: jest.fn(), lista: () => [] };

describe('NodosService', () => {
  /** Un módulo nuevo por test: sin `let` ni estado compartido entre casos (regla §0). */
  const armar = async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodosService,
        { provide: NodosRepository, useValue: mockRepository },
        { provide: EtapasService, useValue: mockEtapas },
        { provide: RolesService, useValue: { filtroDe: jest.fn() } },
        { provide: DerivadoService, useValue: { nodosDe: jest.fn() } },
      ],
    }).compile();
    return module.get(NodosService);
  };

  describe('create', () => {
    it('solo una RAMA lleva color', async () => {
      const service = await armar();
      await expect(
        service.create({ tipo: TipoNodo.TAREA, titulo: 'x', color: '#ffffff' }),
      ).rejects.toThrow(ValidationError);
      await expect(
        service.create({ tipo: TipoNodo.RAMA, titulo: 'x', color: '#ffffff' }),
      ).resolves.toEqual(NODO);
    });

    it('externoOrigen y externoId van juntos', async () => {
      const service = await armar();
      await expect(
        service.create({
          tipo: TipoNodo.TAREA,
          titulo: 'x',
          externoOrigen: 'origen-x',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('el mismo origen + id ya importado es un conflicto (C3)', async () => {
      const service = await armar();
      mockRepository.buscarPorExterno.mockResolvedValueOnce(NODO);

      await expect(
        service.create({
          tipo: TipoNodo.TAREA,
          titulo: 'x',
          externoOrigen: 'origen-x',
          externoId: '1',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('guardarPosiciones', () => {
    const posicion = { id: NODO.id, x: 0, y: 1.6, z: 0 };

    it('guarda y devuelve cuántas', async () => {
      const service = await armar();
      await expect(
        service.guardarPosiciones({ posiciones: [posicion] }),
      ).resolves.toEqual({
        guardadas: 1,
      });
    });

    it('rechaza un id repetido en el lote', async () => {
      const service = await armar();
      await expect(
        service.guardarPosiciones({ posiciones: [posicion, posicion] }),
      ).rejects.toThrow(ValidationError);
    });

    it('404 si algún id no existe', async () => {
      const service = await armar();
      mockRepository.contarExistentes.mockResolvedValueOnce(0);

      await expect(
        service.guardarPosiciones({ posiciones: [posicion] }),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepository.guardarPosiciones).not.toHaveBeenCalled();
    });
  });

  describe('ordenarDia', () => {
    it('guarda el orden y devuelve cuántas', async () => {
      const service = await armar();
      await expect(service.ordenarDia({ ids: [NODO.id] })).resolves.toEqual({
        ordenadas: 1,
      });
      expect(mockRepository.guardarOrdenDelDia).toHaveBeenCalledWith([NODO.id]);
    });

    it('rechaza una tarjeta repetida', async () => {
      const service = await armar();
      await expect(
        service.ordenarDia({ ids: [NODO.id, NODO.id] }),
      ).rejects.toThrow(ValidationError);
    });

    it('404 si algún id no existe', async () => {
      const service = await armar();
      mockRepository.tiposDe.mockResolvedValueOnce([]);

      await expect(service.ordenarDia({ ids: [NODO.id] })).rejects.toThrow(
        NotFoundError,
      );
      expect(mockRepository.guardarOrdenDelDia).not.toHaveBeenCalled();
    });

    it('solo tarjetas: a una FASE el importador le pisaría la etiqueta', async () => {
      const service = await armar();
      mockRepository.tiposDe.mockResolvedValueOnce([TipoNodo.FASE]);

      await expect(service.ordenarDia({ ids: [NODO.id] })).rejects.toThrow(
        ValidationError,
      );
      expect(mockRepository.guardarOrdenDelDia).not.toHaveBeenCalled();
    });
  });
});
