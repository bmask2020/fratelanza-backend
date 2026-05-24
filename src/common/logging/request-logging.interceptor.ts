import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      headers: Record<string, string | undefined>;
      ip?: string;
      user?: { userId?: string };
    }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number; setHeader(name: string, value: string): void }>();
    const requestId = request.headers['x-request-id'] ?? randomUUID();

    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            JSON.stringify({
              requestId,
              method: request.method,
              path: request.originalUrl ?? request.url,
              statusCode: response.statusCode,
              durationMs: Date.now() - start,
              ip: request.ip,
              userId: request.user?.userId,
            }),
          );
        },
      }),
    );
  }
}
