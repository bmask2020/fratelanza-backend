import { PrismaService } from '../prisma.service';
import { AuditLogsRepository } from './audit-logs.repository';

describe('AuditLogsRepository', () => {
  let repository: AuditLogsRepository;
  let prisma: {
    auditLog: {
      create: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    repository = new AuditLogsRepository(prisma as unknown as PrismaService);
  });

  it('creates an audit log with all optional fields when provided', async () => {
    await expect(
      repository.create({
        action: 'users.update',
        actorId: 'user-1',
        entityType: 'user',
        entityId: 'user-2',
        metadata: { status: 'ACTIVE' },
      }),
    ).resolves.toEqual({ id: 'audit-1' });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'users.update',
        actorId: 'user-1',
        entityType: 'user',
        entityId: 'user-2',
        metadata: { status: 'ACTIVE' },
      },
    });
  });

  it('omits optional audit fields when they are not provided', async () => {
    await repository.create({
      action: 'auth.login',
      entityType: 'auth_session',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'auth.login',
        entityType: 'auth_session',
      },
    });
  });
});