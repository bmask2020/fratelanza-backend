import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadInspectionService } from './upload-inspection.service';

describe('UploadInspectionService', () => {
  let service: UploadInspectionService;
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'UPLOAD_SCAN_MODE') {
          return 'basic';
        }

        return undefined;
      }),
    };

    service = new UploadInspectionService(
      configService as unknown as ConfigService,
    );
  });

  it('accepts files with matching allowed MIME type and extension', () => {
    expect(() =>
      service.inspect({
        originalname: 'company-profile.pdf',
        mimetype: 'application/pdf',
        filename: 'stored.pdf',
        size: 1024,
        path: 'uploads/stored.pdf',
      }),
    ).not.toThrow();
  });

  it('rejects empty files when inspection is enabled', () => {
    expect(() =>
      service.inspect({
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        filename: 'empty.pdf',
        size: 0,
        path: 'uploads/empty.pdf',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsupported extensions', () => {
    expect(() =>
      service.inspect({
        originalname: 'payload.exe',
        mimetype: 'application/pdf',
        filename: 'payload.exe',
        size: 1024,
        path: 'uploads/payload.exe',
      }),
    ).toThrow('Unsupported file extension.');
  });

  it('rejects extension and MIME type mismatches', () => {
    expect(() =>
      service.inspect({
        originalname: 'profile.png',
        mimetype: 'application/pdf',
        filename: 'profile.png',
        size: 1024,
        path: 'uploads/profile.png',
      }),
    ).toThrow('File extension does not match the detected MIME type.');
  });

  it('bypasses inspection when scan mode is disabled', () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'UPLOAD_SCAN_MODE') {
        return 'disabled';
      }

      return undefined;
    });

    expect(() =>
      service.inspect({
        originalname: 'payload.exe',
        mimetype: 'application/x-msdownload',
        filename: 'payload.exe',
        size: 0,
        path: 'uploads/payload.exe',
      }),
    ).not.toThrow();
  });
});