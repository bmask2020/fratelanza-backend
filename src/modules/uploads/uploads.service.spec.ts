import { BadRequestException } from '@nestjs/common';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import { UploadInspectionService } from './upload-inspection.service';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  let uploadsService: UploadsService;
  let uploadsRepository: {
    create: jest.Mock;
  };
  let uploadInspectionService: {
    inspect: jest.Mock;
  };

  beforeEach(() => {
    uploadsRepository = {
      create: jest.fn().mockImplementation(async (payload) => ({
        id: 'upload-1',
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        ...payload,
      })),
    };
    uploadInspectionService = {
      inspect: jest.fn(),
    };

    uploadsService = new UploadsService(
      uploadsRepository as unknown as UploadsRepository,
      uploadInspectionService as unknown as UploadInspectionService,
    );
  });

  it('persists uploaded file metadata for the authenticated user', async () => {
    await expect(
      uploadsService.save('user-1', {
        originalname: 'company-profile.pdf',
        mimetype: 'application/pdf',
        filename: 'stored-file.pdf',
        size: 1024,
        path: 'storage/uploads/stored-file.pdf',
      }),
    ).resolves.toMatchObject({
      originalName: 'company-profile.pdf',
      mimeType: 'application/pdf',
      storedName: 'stored-file.pdf',
      size: 1024,
      path: 'storage/uploads/stored-file.pdf',
      uploadedById: 'user-1',
    });
    expect(uploadInspectionService.inspect).toHaveBeenCalledWith({
      originalname: 'company-profile.pdf',
      mimetype: 'application/pdf',
      filename: 'stored-file.pdf',
      size: 1024,
      path: 'storage/uploads/stored-file.pdf',
    });
  });

  it('rejects requests without an uploaded file payload', async () => {
    await expect(uploadsService.save('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('propagates inspection failures before persisting metadata', async () => {
    uploadInspectionService.inspect.mockImplementation(() => {
      throw new BadRequestException('Inspection failed.');
    });

    await expect(
      uploadsService.save('user-1', {
        originalname: 'company-profile.pdf',
        mimetype: 'application/pdf',
        filename: 'stored-file.pdf',
        size: 1024,
        path: 'storage/uploads/stored-file.pdf',
      }),
    ).rejects.toThrow('Inspection failed.');

    expect(uploadsRepository.create).not.toHaveBeenCalled();
  });
});