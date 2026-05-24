import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { UsersRepository } from '../../database/repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let usersService: UsersService;
  let usersRepository: {
    findByEmail: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let auditService: {
    record: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    auditService = {
      record: jest.fn(),
    };

    usersService = new UsersService(
      usersRepository as unknown as UsersRepository,
      auditService as unknown as AuditService,
    );
  });

  it('creates a new managed user', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation(async (payload) => ({
      id: 'user-1',
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T10:00:00.000Z'),
      ...payload,
    }));

    const result = await usersService.create({
      email: 'editor@fratelanza.com',
      password: 'StrongPassword@2026',
      role: Role.EDITOR,
      status: UserStatus.ACTIVE,
    });

    expect(result.email).toBe('editor@fratelanza.com');
    expect(result.role).toBe(Role.EDITOR);
    expect(usersRepository.create).toHaveBeenCalled();
  });

  it('rejects duplicate user emails', async () => {
    usersRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(
      usersService.create({
        email: 'editor@fratelanza.com',
        password: 'StrongPassword@2026',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates an existing user', async () => {
    usersRepository.findById.mockResolvedValue({ id: 'user-1' });
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.update.mockImplementation(async (_id, payload) => ({
      id: 'user-1',
      email: payload.email ?? 'editor@fratelanza.com',
      role: payload.role ?? Role.ADMIN,
      status: payload.status ?? UserStatus.ACTIVE,
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T11:00:00.000Z'),
    }));

    const result = await usersService.update('user-1', {
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });

    expect(result.role).toBe(Role.ADMIN);
  });

  it('throws when requested user is missing', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(usersService.findOne('missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
