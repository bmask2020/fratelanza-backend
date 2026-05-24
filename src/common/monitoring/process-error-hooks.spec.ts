import { Logger } from '@nestjs/common';
import { registerProcessErrorHandlers } from './process-error-hooks';

describe('registerProcessErrorHandlers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers handlers for unhandled rejections and uncaught exceptions', () => {
    const processOnSpy = jest.spyOn(process, 'on');
    const logger = {
      error: jest.fn(),
    } as unknown as Logger;
    const monitoringService = {
      captureException: jest.fn(),
    };

    registerProcessErrorHandlers(monitoringService as never, logger);

    expect(processOnSpy).toHaveBeenNthCalledWith(
      1,
      'unhandledRejection',
      expect.any(Function),
    );
    expect(processOnSpy).toHaveBeenNthCalledWith(
      2,
      'uncaughtException',
      expect.any(Function),
    );

    const unhandledRejectionHandler = processOnSpy.mock.calls[0][1] as (
      reason: unknown,
    ) => void;
    const uncaughtExceptionHandler = processOnSpy.mock.calls[1][1] as (
      error: unknown,
    ) => void;

    unhandledRejectionHandler(new Error('rejected'));
    uncaughtExceptionHandler(new Error('uncaught'));

    expect(monitoringService.captureException).toHaveBeenNthCalledWith(
      1,
      expect.any(Error),
      {
        source: 'process',
        metadata: {
          event: 'unhandledRejection',
        },
      },
    );
    expect(monitoringService.captureException).toHaveBeenNthCalledWith(
      2,
      expect.any(Error),
      {
        source: 'process',
        metadata: {
          event: 'uncaughtException',
        },
      },
    );
  });
});