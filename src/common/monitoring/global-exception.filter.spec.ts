import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';
import { MonitoringService } from './monitoring.service';

describe('GlobalExceptionFilter', () => {
  let monitoringService: {
    captureException: jest.Mock;
  };
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    monitoringService = {
      captureException: jest.fn(),
    };
    filter = new GlobalExceptionFilter(
      monitoringService as unknown as MonitoringService,
    );
  });

  const createHost = () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/admin/overview',
      url: '/api/v1/admin/overview',
      headers: {
        'x-request-id': 'request-1',
      },
      ip: '127.0.0.1',
      user: {
        userId: 'user-1',
      },
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    return { host, request, response };
  };

  it('reports and serializes HTTP exceptions', () => {
    const { host, response } = createHost();
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(monitoringService.captureException).toHaveBeenCalledWith(exception, {
      source: 'http',
      requestId: 'request-1',
      method: 'GET',
      path: '/api/v1/admin/overview',
      statusCode: HttpStatus.FORBIDDEN,
      ip: '127.0.0.1',
      userId: 'user-1',
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Forbidden',
    });
  });

  it('reports and masks unexpected exceptions as internal server errors', () => {
    const { host, response } = createHost();
    const exception = new Error('database exploded');

    filter.catch(exception, host);

    expect(monitoringService.captureException).toHaveBeenCalledWith(exception, {
      source: 'http',
      requestId: 'request-1',
      method: 'GET',
      path: '/api/v1/admin/overview',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      ip: '127.0.0.1',
      userId: 'user-1',
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });
});