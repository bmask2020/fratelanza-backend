import { Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

export function registerProcessErrorHandlers(
  monitoringService: Pick<MonitoringService, 'captureException'>,
  logger = new Logger('Bootstrap'),
) {
  process.on('unhandledRejection', (reason) => {
    monitoringService.captureException(reason, {
      source: 'process',
      metadata: {
        event: 'unhandledRejection',
      },
    });
    logger.error('Unhandled promise rejection captured by monitoring hooks.');
  });

  process.on('uncaughtException', (error) => {
    monitoringService.captureException(error, {
      source: 'process',
      metadata: {
        event: 'uncaughtException',
      },
    });
    logger.error('Uncaught exception captured by monitoring hooks.');
  });
}