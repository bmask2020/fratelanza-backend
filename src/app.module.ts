import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './common/audit/audit.module';
import { RequestLoggingInterceptor } from './common/logging/request-logging.interceptor';
import { GlobalExceptionFilter } from './common/monitoring/global-exception.filter';
import { MonitoringModule } from './common/monitoring/monitoring.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_URL: Joi.string().uri().optional(),
        CORS_ORIGINS: Joi.string().optional(),
        ENABLE_SWAGGER: Joi.string().valid('true', 'false').optional(),
        JWT_ACCESS_SECRET: Joi.string().min(16).optional(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(16).optional(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        ADMIN_EMAIL: Joi.string().email().optional(),
        ADMIN_PASSWORD_HASH: Joi.string().min(20).optional(),
        STORAGE_DRIVER: Joi.string().valid('local').default('local'),
        UPLOAD_DESTINATION: Joi.string().default('uploads/'),
        MAX_UPLOAD_SIZE_MB: Joi.number().integer().min(1).max(100).default(10),
        ALLOWED_UPLOAD_MIME_TYPES: Joi.string().optional(),
        ALLOWED_UPLOAD_EXTENSIONS: Joi.string().optional(),
        UPLOAD_SCAN_MODE: Joi.string().valid('disabled', 'basic').default('basic'),
        MONITORING_ENABLED: Joi.string().valid('true', 'false').default('false'),
        MONITORING_PROVIDER: Joi.string().valid('log', 'sentry').default('log'),
        MONITORING_DSN: Joi.string().optional(),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60_000,
          limit: 60,
        },
      ],
    }),
    AuditModule,
    MonitoringModule,
    PrismaModule,
    AuthModule,
    ContactsModule,
    DashboardModule,
    AdminModule,
    HealthModule,
    UsersModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
