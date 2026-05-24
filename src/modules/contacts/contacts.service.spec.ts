import { ContactStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { ContactsService } from './contacts.service';

describe('ContactsService', () => {
  let contactsService: ContactsService;
  let contactsRepository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    updateWorkflow: jest.Mock;
  };
  let usersRepository: {
    findById: jest.Mock;
  };
  let auditService: {
    record: jest.Mock;
  };

  beforeEach(() => {
    contactsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      updateWorkflow: jest.fn(),
    };
    usersRepository = {
      findById: jest.fn(),
    };
    auditService = {
      record: jest.fn(),
    };

    contactsService = new ContactsService(
      contactsRepository as unknown as ContactsRepository,
      usersRepository as unknown as UsersRepository,
      auditService as unknown as AuditService,
    );
  });

  it('creates a persisted contact submission with a pending status', async () => {
    contactsRepository.create.mockResolvedValue({
      id: 'contact-1',
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      subject: 'Partnership inquiry',
      message: 'We need more information about your services.',
      status: ContactStatus.PENDING,
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T10:00:00.000Z'),
    });

    const submission = await contactsService.create({
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      subject: 'Partnership inquiry',
      message: 'We need more information about your services.',
    });

    expect(submission.id).toBeDefined();
    expect(submission.status).toBe(ContactStatus.PENDING);
  });

  it('returns persisted contact submissions from the repository', async () => {
    contactsRepository.findAll.mockResolvedValue([
      [
        {
          id: 'contact-1',
          name: 'Ahmed Ali',
          email: 'ahmed@example.com',
          subject: 'Partnership inquiry',
          message: 'We need more information about your services.',
          status: ContactStatus.PENDING,
          createdAt: new Date('2026-05-24T10:00:00.000Z'),
          updatedAt: new Date('2026-05-24T10:00:00.000Z'),
        },
      ],
      1,
    ]);

    await expect(contactsService.findAll()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'contact-1' })],
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('updates the workflow status and assigned handler for a contact', async () => {
    contactsRepository.findById.mockResolvedValue({ id: 'contact-1' });
    usersRepository.findById.mockResolvedValue({ id: 'admin-1' });
    contactsRepository.updateWorkflow.mockResolvedValue({
      id: 'contact-1',
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      subject: 'Partnership inquiry',
      message: 'We need more information about your services.',
      status: ContactStatus.IN_PROGRESS,
      handledBy: {
        id: 'admin-1',
        email: 'admin@fratelanza.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T11:00:00.000Z'),
    });

    const result = await contactsService.updateWorkflow('contact-1', {
      status: ContactStatus.IN_PROGRESS,
      handledById: 'admin-1',
    });

    expect(result.status).toBe(ContactStatus.IN_PROGRESS);
    expect(result.handledBy?.id).toBe('admin-1');
  });
});
