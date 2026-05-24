jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'generated-request-id'),
}));

import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new RequestLoggingInterceptor();
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createContext = (requestOverrides?: {
    headers?: Record<string, string | undefined>;
    originalUrl?: string;
    url?: string;
    ip?: string;
    user?: { userId?: string };
  }) => {
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/dashboard/summary',
      url: '/api/v1/dashboard/summary',
      headers: {},
      ip: '127.0.0.1',
      user: { userId: 'user-1' },
      ...requestOverrides,
    };
    const response = {
      statusCode: 200,
      setHeader: jest.fn(),
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;

    return { context, request, response };
  };

  it('reuses the incoming x-request-id and logs the request metadata', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1045);
    const { context, response } = createContext({
      headers: { 'x-request-id': 'incoming-request-id' },
    });
    const next = {
      handle: jest.fn(() => of('ok')),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe('ok');

    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'incoming-request-id');
    expect(loggerSpy).toHaveBeenCalledWith(
      JSON.stringify({
        requestId: 'incoming-request-id',
        method: 'GET',
        path: '/api/v1/dashboard/summary',
        statusCode: 200,
        durationMs: 45,
        ip: '127.0.0.1',
        userId: 'user-1',
      }),
    );

    dateNowSpy.mockRestore();
  });

  it('generates a request id when the header is missing and falls back to request.url', async () => {
    const dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(2000)
      .mockReturnValueOnce(2010);
    const { context, response } = createContext({
      headers: {},
      originalUrl: undefined,
      url: '/api/v1/health/live',
      ip: undefined,
      user: undefined,
    });
    const next = {
      handle: jest.fn(() => of({ status: 'ok' })),
    } as CallHandler;

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({
      status: 'ok',
    });

    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'generated-request-id');
    expect(loggerSpy).toHaveBeenCalledWith(
      JSON.stringify({
        requestId: 'generated-request-id',
        method: 'GET',
        path: '/api/v1/health/live',
        statusCode: 200,
        durationMs: 10,
        ip: undefined,
        userId: undefined,
      }),
    );

    dateNowSpy.mockRestore();
  });
});