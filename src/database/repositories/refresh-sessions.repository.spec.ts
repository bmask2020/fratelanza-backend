import { PrismaService } from '../prisma.service';
import { RefreshSessionsRepository } from './refresh-sessions.repository';

describe('RefreshSessionsRepository', () => {
  let repository: RefreshSessionsRepository;
  let prisma: {
    refreshSession: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      refreshSession: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'session-1' }),
        update: jest.fn().mockResolvedValue({ id: 'session-1' }),
      },
    };

    repository = new RefreshSessionsRepository(prisma as unknown as PrismaService);
  });

  it('creates a refresh session', async () => {
    const input = {
      id: 'session-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date('2026-05-25T00:00:00.000Z'),
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
    };

    await repository.create(input);

    expect(prisma.refreshSession.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it('finds a refresh session by id', async () => {
    await repository.findById('session-1');

    expect(prisma.refreshSession.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-1' },
    });
  });

  it('rotates a refresh session and clears revokedAt', async () => {
    const expiresAt = new Date('2026-05-26T00:00:00.000Z');

    await repository.rotate(
      'session-1',
      'next-hash',
      expiresAt,
      'jest-refresh',
      '127.0.0.2',
    );

    expect(prisma.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        tokenHash: 'next-hash',
        expiresAt,
        revokedAt: null,
        userAgent: 'jest-refresh',
        ipAddress: '127.0.0.2',
      },
    });
  });

  it('revokes a refresh session with the current timestamp', async () => {
    await repository.revoke('session-1');

    expect(prisma.refreshSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});