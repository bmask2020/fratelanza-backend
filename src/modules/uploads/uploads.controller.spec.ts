import { Role } from '../../common/auth/roles.enum';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

describe('UploadsController', () => {
  let uploadsController: UploadsController;
  let uploadsService: {
    save: jest.Mock;
  };

  beforeEach(() => {
    uploadsService = {
      save: jest.fn().mockResolvedValue({ id: 'upload-1' }),
    };

    uploadsController = new UploadsController(
      uploadsService as unknown as UploadsService,
    );
  });

  it('delegates file persistence with the authenticated user id', async () => {
    const request = {
      user: {
        userId: 'user-1',
        email: 'admin@fratelanza.com',
        role: Role.SuperAdmin,
      },
    };
    const file = {
      originalname: 'company-profile.pdf',
      mimetype: 'application/pdf',
      filename: 'stored-file.pdf',
      size: 1024,
      path: 'storage/uploads/stored-file.pdf',
    };

    await expect(uploadsController.upload(request as never, file)).resolves.toEqual({
      id: 'upload-1',
    });
    expect(uploadsService.save).toHaveBeenCalledWith('user-1', file);
  });
});