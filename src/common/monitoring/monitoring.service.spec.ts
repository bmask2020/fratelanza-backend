import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService', () => {
  let configService: {
    get: jest.Mock;
  };
  let service: MonitoringService;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MONITORING_ENABLED') {
          return 'true';
        }

        if (key === 'MONITORING_PROVIDER') {
          return 'log';
        }

        return undefined;
      }),
    };
    service = new MonitoringService(configService as unknown as ConfigService);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('captures exceptions when monitoring is enabled', () => {
    service.captureException(new Error('boom'), {
      source: 'http',
      path: '/api/v1/test',
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"monitoring.exception"'),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('"path":"/api/v1/test"'),
    );
  });

  it('captures messages when monitoring is enabled', () => {
    service.captureMessage('monitoring ready', {
      source: 'application',
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"monitoring.message"'),
    );
  });

  it('does nothing when monitoring is disabled', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'MONITORING_ENABLED') {
        return 'false';
      }

      return undefined;
    });

    service.captureException(new Error('ignored'));
    service.captureMessage('ignored');

    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});