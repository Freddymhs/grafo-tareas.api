import { TIPO_NODO } from '../../common/constants/tipos.constants.js';
import { Test, TestingModule } from '@nestjs/testing';
import { EstadoNodo } from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../common/exceptions/domain.exceptions';
import { EtapasDelEspacioService } from './etapas-del-espacio.service';
import { DerivadoService } from '../derivado/derivado.service';
import { RolesService } from '../roles/roles.service';
import { NodosRepository } from './nodos.repository';
import { NodosService } from './nodos.service';
import { ProyectoPorDefectoService } from './proyecto-por-defecto.service';

const NODO = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  tipo: TIPO_NODO.TAREA,
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
  proyectoConEspacio: jest
    .fn()
    .mockResolvedValue({ id: 'p', espacio: { id: 'e', nombre: 'SIGSA' } }),
  tipoEnEspacio: jest.fn().mockResolvedValue({ tieneCiclo: true }),
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
        { provide: EtapasDelEspacioService, useValue: mockEtapas },
        { provide: RolesService, useValue: { filtroDe: jest.fn() } },
        { provide: DerivadoService, useValue: { nodosDe: jest.fn() } },
        {
          provide: ProyectoPorDefectoService,
          useValue: {
            resolver: jest
              .fn()
              .mockResolvedValue({ proyectoId: 'p', porDefecto: true }),
          },
        },
      ],
    }).compile();
    return module.get(NodosService);
  };

  describe('create', () => {
    it('solo una RAMA lleva color', async () => {
      const service = await armar();
      await expect(
        service.create({
          tipo: TIPO_NODO.TAREA,
          titulo: 'x',
          color: '#ffffff',
        }),
      ).rejects.toThrow(ValidationError);
      await expect(
        service.create({ tipo: TIPO_NODO.RAMA, titulo: 'x', color: '#ffffff' }),
      ).resolves.toEqual(NODO);
    });

    it('externoOrigen y externoId van juntos', async () => {
      const service = await armar();
      await expect(
        service.create({
          tipo: TIPO_NODO.TAREA,
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
          tipo: TIPO_NODO.TAREA,
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
});
