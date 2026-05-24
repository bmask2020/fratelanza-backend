import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { RefreshSessionsRepository } from '../../database/repositories/refresh-sessions.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };
  let usersRepository: {
    ensureSeedAdmin: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
  };
  let refreshSessionsRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    rotate: jest.Mock;
    revoke: jest.Mock;
  };
  let auditService: {
    record: jest.Mock;
  };

  beforeEach(async () => {
    usersRepository = {
      ensureSeedAdmin: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };
    refreshSessionsRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
    };
    auditService = {
      record: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') {
          return 'test-access-secret';
        }

        if (key === 'JWT_REFRESH_SECRET') {
          return 'test-refresh-secret';
        }

        if (key === 'JWT_ACCESS_EXPIRES_IN') {
          return '15m';
        }

        if (key === 'JWT_REFRESH_EXPIRES_IN') {
          return '7d';
        }

        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: UsersRepository,
          useValue: usersRepository,
        },
        {
          provide: RefreshSessionsRepository,
          useValue: refreshSessionsRepository,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('returns tokens for valid seeded admin credentials', async () => {
    jwtService.signAsync
      .mockResolvedValueOnce('refresh-token')
      .mockResolvedValueOnce('access-token');
    usersRepository.findByEmail.mockResolvedValue({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      passwordHash: '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q',
    });

    const response = await authService.signIn({
      email: 'admin@fratelanza.com',
      password: 'Fratelanza@2026',
    }, {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('refresh-token');
    expect(usersRepository.ensureSeedAdmin).toHaveBeenCalled();
    expect(response.user.email).toBe('admin@fratelanza.com');
    expect(refreshSessionsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'db-admin-id',
        userAgent: 'jest',
        ipAddress: '127.0.0.1',
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'auth.login',
      actorId: 'db-admin-id',
      entityType: 'auth_session',
      metadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });
  });

  it('rejects invalid credentials', async () => {
    usersRepository.findByEmail.mockResolvedValue({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      passwordHash: '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q',
    });

    await expect(
      authService.signIn({
        email: 'admin@fratelanza.com',
        password: 'wrong-password',
      }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens for a valid persisted session', async () => {
    const tokenHash = await bcrypt.hash('refresh-token', 10);

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    jwtService.signAsync
      .mockResolvedValueOnce('next-refresh-token')
      .mockResolvedValueOnce('next-access-token');
    refreshSessionsRepository.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'db-admin-id',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    usersRepository.findById.mockResolvedValue({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
    });

    await expect(
      authService.refreshSession('refresh-token', {
        ipAddress: '127.0.0.10',
        userAgent: 'jest-refresh',
      }),
    ).resolves.toEqual({
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      user: {
        id: 'db-admin-id',
        email: 'admin@fratelanza.com',
        role: Role.SUPER_ADMIN,
      },
    });

    expect(refreshSessionsRepository.rotate).toHaveBeenCalledWith(
      'session-1',
      expect.any(String),
      expect.any(Date),
      'jest-refresh',
      '127.0.0.10',
    );
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'auth.refresh',
      actorId: 'db-admin-id',
      entityType: 'auth_session',
      entityId: 'session-1',
      metadata: {
        ipAddress: '127.0.0.10',
        userAgent: 'jest-refresh',
      },
    });
  });

  it('rejects refresh when the token cannot be verified', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(
      authService.refreshSession('bad-token', {}),
    ).rejects.toThrow('Refresh token is invalid.');
  });

  it('rejects refresh when the stored session is invalid', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    refreshSessionsRepository.findById.mockResolvedValue(null);

    await expect(
      authService.refreshSession('refresh-token', {}),
    ).rejects.toThrow('Refresh session is invalid.');
  });

  it('rejects refresh when the stored hash does not match the token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    refreshSessionsRepository.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'db-admin-id',
      tokenHash: await bcrypt.hash('different-token', 10),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    await expect(
      authService.refreshSession('refresh-token', {}),
    ).rejects.toThrow('Refresh token is invalid.');
  });

  it('rejects refresh when the user no longer exists', async () => {
    const tokenHash = await bcrypt.hash('refresh-token', 10);

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    refreshSessionsRepository.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'db-admin-id',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      authService.refreshSession('refresh-token', {}),
    ).rejects.toThrow('User account was not found.');
  });

  it('revokes the refresh session and records logout when the token matches', async () => {
    const tokenHash = await bcrypt.hash('refresh-token', 10);

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    refreshSessionsRepository.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'db-admin-id',
      tokenHash,
      revokedAt: null,
    });

    await expect(authService.logout('refresh-token')).resolves.toEqual({
      success: true,
    });

    expect(refreshSessionsRepository.revoke).toHaveBeenCalledWith('session-1');
    expect(auditService.record).toHaveBeenCalledWith({
      action: 'auth.logout',
      actorId: 'db-admin-id',
      entityType: 'auth_session',
      entityId: 'session-1',
    });
  });

  it('returns success without revoking when the session is already revoked or missing', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
      sid: 'session-1',
    });
    refreshSessionsRepository.findById.mockResolvedValue({
      id: 'session-1',
      userId: 'db-admin-id',
      tokenHash: 'ignored-hash',
      revokedAt: new Date(),
    });

    await expect(authService.logout('refresh-token')).resolves.toEqual({
      success: true,
    });

    expect(refreshSessionsRepository.revoke).not.toHaveBeenCalled();
  });

  it('returns the persisted profile for the authenticated user', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
    });

    await expect(
      authService.getProfile({
        userId: 'db-admin-id',
        email: 'admin@fratelanza.com',
        role: Role.SUPER_ADMIN,
      }),
    ).resolves.toEqual({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
    });
  });

  it('rejects profile lookup when the authenticated user no longer exists', async () => {
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      authService.getProfile({
        userId: 'db-admin-id',
        email: 'admin@fratelanza.com',
        role: Role.SUPER_ADMIN,
      }),
    ).rejects.toThrow('User account was not found.');
  });
});
