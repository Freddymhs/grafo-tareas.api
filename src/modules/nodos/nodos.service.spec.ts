import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo, TipoNodo } from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/domain.exceptions';
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
};

describe('NodosService', () => {
  let service: NodosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodosService,
        { provide: NodosRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get(NodosService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('solo una RAMA lleva color', async () => {
      await expect(
        service.create({ tipo: TipoNodo.TAREA, titulo: 'x', color: '#ffffff' }),
      ).rejects.toThrow(ValidationError);
      await expect(
        service.create({ tipo: TipoNodo.RAMA, titulo: 'x', color: '#ffffff' }),
      ).resolves.toEqual(NODO);
    });

    it('externoOrigen y externoId van juntos', async () => {
      await expect(
        service.create({
          tipo: TipoNodo.TAREA,
          titulo: 'x',
          externoOrigen: 'origen-x',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('el mismo origen + id ya importado es un conflicto (C3)', async () => {
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
      await expect(
        service.guardarPosiciones({ posiciones: [posicion] }),
      ).resolves.toEqual({
        guardadas: 1,
      });
    });

    it('rechaza un id repetido en el lote', async () => {
      await expect(
        service.guardarPosiciones({ posiciones: [posicion, posicion] }),
      ).rejects.toThrow(ValidationError);
    });

    it('404 si algún id no existe', async () => {
      mockRepository.contarExistentes.mockResolvedValueOnce(0);

      await expect(
        service.guardarPosiciones({ posiciones: [posicion] }),
      ).rejects.toThrow(NotFoundError);
      expect(mockRepository.guardarPosiciones).not.toHaveBeenCalled();
    });
  });
});
