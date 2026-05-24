import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { API_PREFIX, SWAGGER_PATH } from './constants';
import { setupApplication } from './setup-app';

describe('setupApplication', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('configures the application pipeline and swagger when enabled', () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          CORS_ORIGINS: 'https://fratelanza.com,https://admin.fratelanza.com',
          NODE_ENV: 'development',
          ENABLE_SWAGGER: 'true',
        };

        return config[key];
      }),
    };

    const app = {
      get: jest.fn().mockReturnValue(configService),
      setGlobalPrefix: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
    };

    const swaggerDocument = { openapi: '3.0.0' };
    const createDocumentSpy = jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue(swaggerDocument as never);
    const setupSpy = jest
      .spyOn(SwaggerModule, 'setup')
      .mockImplementation(() => undefined);

    const result = setupApplication(app as never);

    expect(result).toBe(app);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith(API_PREFIX);
    expect(app.use).toHaveBeenCalledTimes(1);
    expect(typeof app.use.mock.calls[0][0]).toBe('function');
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: true,
        origin: expect.any(Function),
      }),
    );
    expect(app.useGlobalPipes).toHaveBeenCalledWith(
      expect.any(ValidationPipe),
    );
    expect(createDocumentSpy).toHaveBeenCalledWith(app, expect.any(Object));
    expect(setupSpy).toHaveBeenCalledWith(
      SWAGGER_PATH,
      app,
      swaggerDocument,
      {
        swaggerOptions: {
          persistAuthorization: true,
        },
      },
    );
  });

  it('skips swagger setup in production when it is not explicitly enabled', () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          CORS_ORIGINS: '',
          NODE_ENV: 'production',
          ENABLE_SWAGGER: 'false',
        };

        return config[key];
      }),
    };

    const app = {
      get: jest.fn().mockImplementation((token: unknown) => {
        if (token === ConfigService) {
          return configService;
        }

        return undefined;
      }),
      setGlobalPrefix: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
    };

    const createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument');
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');

    setupApplication(app as never);

    expect(createDocumentSpy).not.toHaveBeenCalled();
    expect(setupSpy).not.toHaveBeenCalled();
  });
});