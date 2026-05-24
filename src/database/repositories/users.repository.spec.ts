import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'user-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };

    repository = new UsersRepository(prisma as unknown as PrismaService);
  });

  it('finds users by email and id', async () => {
    await repository.findByEmail('admin@fratelanza.com');
    await repository.findById('user-1');

    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'admin@fratelanza.com' },
    });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-1' },
    });
  });

  it('creates a user', async () => {
    const input = {
      email: 'editor@fratelanza.com',
      passwordHash: 'hash',
      role: Role.EDITOR,
      status: UserStatus.ACTIVE,
    };

    await repository.create(input);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it('lists users with filters and pagination', async () => {
    await repository.findAll({
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      search: 'admin',
      page: 3,
      limit: 2,
    });

    const where = {
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      email: {
        contains: 'admin',
        mode: 'insensitive',
      },
    };

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: 4,
      take: 2,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({ where });
  });

  it('updates a user', async () => {
    await repository.update('user-1', {
      email: 'updated@fratelanza.com',
      role: Role.ADMIN,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        email: 'updated@fratelanza.com',
        role: Role.ADMIN,
      },
    });
  });

  it('counts all users and users by status', async () => {
    await repository.countAll();
    await repository.countByStatus(UserStatus.INACTIVE);

    expect(prisma.user.count).toHaveBeenNthCalledWith(1);
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, {
      where: { status: UserStatus.INACTIVE },
    });
  });

  it('returns the existing seeded admin when already present', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@fratelanza.com',
    });

    await expect(
      repository.ensureSeedAdmin('admin@fratelanza.com', 'hash'),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'admin@fratelanza.com',
    });

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates the seeded admin when it does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await repository.ensureSeedAdmin('admin@fratelanza.com', 'hash');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'admin@fratelanza.com',
        passwordHash: 'hash',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
  });
});