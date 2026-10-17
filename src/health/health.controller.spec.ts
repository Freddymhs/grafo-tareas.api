import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  isHealthy: jest.fn(),
};

const createMockReply = () => {
  const reply = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockResolvedValue(undefined),
  };
  return reply as unknown as Parameters<HealthController['check']>[0];
};

describe('HealthController', () => {
  /** Un módulo nuevo por test: sin `let` ni estado compartido (regla §0). */
  const armar = async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    return module.get<HealthController>(HealthController);
  };

  it('should return 200 ok when DB is healthy', async () => {
    const controller = await armar();
    mockPrisma.isHealthy.mockResolvedValue(true);
    const reply = createMockReply();

    await controller.check(reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', db: 'connected' }),
    );
  });

  it('should return 503 degraded when DB is down', async () => {
    const controller = await armar();
    mockPrisma.isHealthy.mockResolvedValue(false);
    const reply = createMockReply();

    await controller.check(reply);

    expect(reply.status).toHaveBeenCalledWith(503);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'degraded', db: 'disconnected' }),
    );
  });
});
