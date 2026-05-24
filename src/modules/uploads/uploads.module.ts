import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import {
  createMulterOptions,
  parseAllowedUploadMimeTypes,
} from '../../config/runtime-config';
import { UploadInspectionService } from './upload-inspection.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createMulterOptions(
          configService.get<string>('UPLOAD_DESTINATION') ?? 'uploads/',
          configService.get<number>('MAX_UPLOAD_SIZE_MB') ?? 10,
          parseAllowedUploadMimeTypes(
            configService.get<string>('ALLOWED_UPLOAD_MIME_TYPES'),
          ),
        ),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRepository, UploadInspectionService],
})
export class UploadsModule {}
