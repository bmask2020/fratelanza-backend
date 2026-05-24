import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UploadedFilePayload } from './types/uploaded-file.type';

const DEFAULT_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

const MIME_TYPE_TO_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

@Injectable()
export class UploadInspectionService {
  constructor(private readonly configService: ConfigService) {}

  inspect(file: UploadedFilePayload) {
    if (this.getScanMode() === 'disabled') {
      return;
    }

    if (file.size <= 0) {
      throw new BadRequestException('Uploaded files must not be empty.');
    }

    const extension = this.extractExtension(file.originalname);
    const allowedExtensions = this.getAllowedExtensions();

    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Unsupported file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
      );
    }

    const expectedExtensions = MIME_TYPE_TO_EXTENSIONS[file.mimetype] ?? [];

    if (expectedExtensions.length > 0 && !expectedExtensions.includes(extension)) {
      throw new BadRequestException(
        'File extension does not match the detected MIME type.',
      );
    }
  }

  private getScanMode(): 'disabled' | 'basic' {
    return (this.configService.get<string>('UPLOAD_SCAN_MODE') ?? 'basic') as
      | 'disabled'
      | 'basic';
  }

  private getAllowedExtensions(): string[] {
    const configured = this.configService.get<string>('ALLOWED_UPLOAD_EXTENSIONS');

    if (!configured) {
      return [...DEFAULT_ALLOWED_EXTENSIONS];
    }

    return configured
      .split(',')
      .map((extension) => extension.trim().toLowerCase())
      .filter(Boolean);
  }

  private extractExtension(fileName: string): string | null {
    const normalized = fileName.trim().toLowerCase();
    const lastDotIndex = normalized.lastIndexOf('.');

    if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) {
      return null;
    }

    return normalized.slice(lastDotIndex);
  }
}