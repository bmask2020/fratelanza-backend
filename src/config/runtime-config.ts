import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';

const ONE_MB = 1024 * 1024;
const DEFAULT_ALLOWED_UPLOAD_MIME_TYPES: string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

export function isSwaggerEnabled(
  environment?: string,
  explicitFlag?: string,
): boolean {
  if (explicitFlag) {
    return explicitFlag.toLowerCase() === 'true';
  }

  return environment !== 'production';
}

export function parseCorsOrigins(value?: string): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parseAllowedUploadMimeTypes(value?: string): string[] {
  if (!value) {
    return [...DEFAULT_ALLOWED_UPLOAD_MIME_TYPES];
  }

  return value
    .split(',')
    .map((mimeType) => mimeType.trim())
    .filter(Boolean);
}

export function createUploadFileFilter(allowedMimeTypes: string[]) {
  return (
    _request: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new BadRequestException(
        `Unsupported file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      ),
      false,
    );
  };
}

export function createCorsOriginDelegate(allowedOrigins: string[]) {
  if (allowedOrigins.length === 0) {
    return true;
  }

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS.'));
  };
}

export function createMulterOptions(
  destination = 'uploads/',
  maxUploadSizeMb = 10,
  allowedMimeTypes: string[] = [...DEFAULT_ALLOWED_UPLOAD_MIME_TYPES],
): MulterOptions {
  return {
    dest: destination,
    limits: {
      fileSize: maxUploadSizeMb * ONE_MB,
      files: 1,
    },
    fileFilter: createUploadFileFilter(allowedMimeTypes),
  };
}
