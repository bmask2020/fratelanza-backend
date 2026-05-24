import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MonitoringService } from './monitoring.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly monitoringService: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<
      Request & {
        user?: { userId?: string };
      }
    >();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    this.monitoringService.captureException(exception, {
      source: 'http',
      requestId: request.headers['x-request-id'] as string | undefined,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: status,
      ip: request.ip,
      userId: request.user?.userId,
    });

    const responseBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
          };

    response.status(status).json(
      typeof responseBody === 'string'
        ? {
            statusCode: status,
            message: responseBody,
          }
        : responseBody,
    );
  }
}