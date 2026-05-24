import { ContactStatus, Role, UserStatus } from '@prisma/client';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

describe('ContactsController', () => {
  let contactsController: ContactsController;
  let contactsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    updateWorkflow: jest.Mock;
  };

  beforeEach(() => {
    contactsService = {
      create: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      findAll: jest.fn().mockResolvedValue({ items: [], meta: { total: 0 } }),
      updateWorkflow: jest.fn().mockResolvedValue({
        id: 'contact-1',
        status: ContactStatus.IN_PROGRESS,
        handledBy: {
          id: 'user-1',
          email: 'admin@fratelanza.com',
          role: Role.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      }),
    };

    contactsController = new ContactsController(
      contactsService as unknown as ContactsService,
    );
  });

  it('creates a contact submission through the service', async () => {
    const dto = {
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      subject: 'Partnership inquiry',
      message: 'Need more details.',
    };

    await expect(contactsController.create(dto)).resolves.toEqual({ id: 'contact-1' });
    expect(contactsService.create).toHaveBeenCalledWith(dto);
  });

  it('lists contacts through the service', async () => {
    const query = { page: 1, limit: 10, status: ContactStatus.PENDING };

    await expect(contactsController.findAll(query as never)).resolves.toEqual({
      items: [],
      meta: { total: 0 },
    });
    expect(contactsService.findAll).toHaveBeenCalledWith(query);
  });

  it('updates contact workflow through the service', async () => {
    const dto = {
      status: ContactStatus.IN_PROGRESS,
      handledById: 'user-1',
    };

    await expect(
      contactsController.updateWorkflow('contact-1', dto),
    ).resolves.toMatchObject({
      id: 'contact-1',
      status: ContactStatus.IN_PROGRESS,
    });
    expect(contactsService.updateWorkflow).toHaveBeenCalledWith('contact-1', dto);
  });
});