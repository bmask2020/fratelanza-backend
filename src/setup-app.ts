import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { API_PREFIX, SWAGGER_PATH } from './constants';
import {
  createCorsOriginDelegate,
  isSwaggerEnabled,
  parseCorsOrigins,
} from './config/runtime-config';

export function setupApplication(app: INestApplication): INestApplication {
  const configService = app.get(ConfigService);
  const allowedOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS'),
  );

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.enableCors({
    origin: createCorsOriginDelegate(allowedOrigins),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (
    isSwaggerEnabled(
      configService.get<string>('NODE_ENV'),
      configService.get<string>('ENABLE_SWAGGER'),
    )
  ) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FRATELANZA Backend API')
      .setDescription('Core backend APIs for FRATELANZA system integration.')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(SWAGGER_PATH, app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  return app;
}
