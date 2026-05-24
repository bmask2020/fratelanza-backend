import { PrismaService } from '../prisma.service';
import { UploadsRepository } from './uploads.repository';

describe('UploadsRepository', () => {
  let repository: UploadsRepository;
  let prisma: {
    uploadedFile: {
      create: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      uploadedFile: {
        create: jest.fn().mockResolvedValue({ id: 'upload-1' }),
        count: jest.fn().mockResolvedValue(3),
      },
    };

    repository = new UploadsRepository(prisma as unknown as PrismaService);
  });

  it('creates an uploaded file record', async () => {
    const input = {
      originalName: 'profile.pdf',
      storedName: 'stored-profile.pdf',
      mimeType: 'application/pdf',
      path: 'storage/uploads/stored-profile.pdf',
      size: 1024,
      uploadedById: 'user-1',
    };

    await repository.create(input);

    expect(prisma.uploadedFile.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it('counts all uploaded files', async () => {
    await expect(repository.countAll()).resolves.toBe(3);
    expect(prisma.uploadedFile.count).toHaveBeenCalledTimes(1);
  });
});