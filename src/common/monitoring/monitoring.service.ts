import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface MonitoringContext {
  source?: 'http' | 'process' | 'application';
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly configService: ConfigService) {}

  captureException(error: unknown, context: MonitoringContext = {}) {
    if (!this.isEnabled()) {
      return;
    }

    const exception = error instanceof Error ? error : new Error(String(error));

    this.logger.error(
      JSON.stringify({
        type: 'monitoring.exception',
        provider: this.getProvider(),
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        ...context,
      }),
    );
  }

  captureMessage(message: string, context: MonitoringContext = {}) {
    if (!this.isEnabled()) {
      return;
    }

    this.logger.log(
      JSON.stringify({
        type: 'monitoring.message',
        provider: this.getProvider(),
        message,
        ...context,
      }),
    );
  }

  private isEnabled(): boolean {
    return this.configService.get<string>('MONITORING_ENABLED') === 'true';
  }

  private getProvider(): string {
    return this.configService.get<string>('MONITORING_PROVIDER') ?? 'log';
  }
}