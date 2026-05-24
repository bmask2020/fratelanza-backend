import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let healthService: HealthService;
  let prisma: {
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };

    healthService = new HealthService(prisma as unknown as PrismaService);
  });

  it('returns an ok liveness payload with a timestamp', () => {
    const result = healthService.getLiveness();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('returns database readiness when Prisma responds', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ '?column?': 1 }]);

    await expect(healthService.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      database: 'up',
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws service unavailable when Prisma readiness fails', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('database unavailable'));

    await expect(healthService.getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await expect(healthService.getReadiness()).rejects.toMatchObject({
      response: {
        status: 'error',
        database: 'down',
      },
    });
  });
});