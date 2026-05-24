import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;
  let healthService: {
    getLiveness: jest.Mock;
    getReadiness: jest.Mock;
  };

  beforeEach(() => {
    healthService = {
      getLiveness: jest.fn().mockReturnValue({ status: 'ok' }),
      getReadiness: jest.fn().mockResolvedValue({ status: 'ok', database: 'up' }),
    };

    healthController = new HealthController(healthService as unknown as HealthService);
  });

  it('returns liveness from the service', () => {
    expect(healthController.getLiveness()).toEqual({ status: 'ok' });
    expect(healthService.getLiveness).toHaveBeenCalledTimes(1);
  });

  it('returns readiness from the service', async () => {
    await expect(healthController.getReadiness()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
  });
});