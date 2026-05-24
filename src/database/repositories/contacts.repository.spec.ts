import { ContactStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { ContactsRepository } from './contacts.repository';

describe('ContactsRepository', () => {
  let repository: ContactsRepository;
  let prisma: {
    contactSubmission: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      contactSubmission: {
        create: jest.fn().mockResolvedValue({ id: 'contact-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue({ id: 'contact-1' }),
        update: jest.fn().mockResolvedValue({ id: 'contact-1' }),
      },
    };

    repository = new ContactsRepository(prisma as unknown as PrismaService);
  });

  it('creates a contact submission including the handler relation', async () => {
    const input = {
      name: 'Ahmed Ali',
      email: 'ahmed@example.com',
      subject: 'Partnership inquiry',
      message: 'Need details.',
      phone: '0100',
      company: 'FRATELANZA',
    };

    await repository.create(input);

    expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
      data: input,
      include: {
        handledBy: true,
      },
    });
  });

  it('lists contacts with filters, pagination, and handler include', async () => {
    await repository.findAll({
      status: ContactStatus.PENDING,
      handledById: 'user-1',
      search: 'Ahmed',
      page: 2,
      limit: 5,
    });

    const where = {
      status: ContactStatus.PENDING,
      handledById: 'user-1',
      OR: [
        {
          name: {
            contains: 'Ahmed',
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: 'Ahmed',
            mode: 'insensitive',
          },
        },
        {
          subject: {
            contains: 'Ahmed',
            mode: 'insensitive',
          },
        },
        {
          company: {
            contains: 'Ahmed',
            mode: 'insensitive',
          },
        },
      ],
    };

    expect(prisma.contactSubmission.findMany).toHaveBeenCalledWith({
      where,
      include: {
        handledBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 5,
      take: 5,
    });
    expect(prisma.contactSubmission.count).toHaveBeenCalledWith({ where });
  });

  it('uses default pagination and empty filters when listing contacts without input', async () => {
    await repository.findAll();

    expect(prisma.contactSubmission.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        handledBy: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 10,
    });
    expect(prisma.contactSubmission.count).toHaveBeenCalledWith({ where: {} });
  });

  it('finds a contact by id including the handler relation', async () => {
    await repository.findById('contact-1');

    expect(prisma.contactSubmission.findUnique).toHaveBeenCalledWith({
      where: { id: 'contact-1' },
      include: {
        handledBy: true,
      },
    });
  });

  it('updates contact workflow including the handler relation', async () => {
    await repository.updateWorkflow('contact-1', {
      status: ContactStatus.IN_PROGRESS,
      handledById: 'user-1',
    });

    expect(prisma.contactSubmission.update).toHaveBeenCalledWith({
      where: { id: 'contact-1' },
      data: {
        status: ContactStatus.IN_PROGRESS,
        handledById: 'user-1',
      },
      include: {
        handledBy: true,
      },
    });
  });

  it('counts all contacts and contacts by status', async () => {
    await repository.countAll();
    await repository.countByStatus(ContactStatus.RESOLVED);

    expect(prisma.contactSubmission.count).toHaveBeenNthCalledWith(1);
    expect(prisma.contactSubmission.count).toHaveBeenNthCalledWith(2, {
      where: { status: ContactStatus.RESOLVED },
    });
  });
});