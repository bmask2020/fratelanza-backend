import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ContactStatus, Role, UserStatus } from '@prisma/client';
import { AuditService } from './../src/common/audit/audit.service';
import { RefreshSessionsRepository } from './../src/database/repositories/refresh-sessions.repository';
import { UsersRepository } from './../src/database/repositories/users.repository';
import { ContactsRepository } from './../src/database/repositories/contacts.repository';
import { UploadsRepository } from './../src/database/repositories/uploads.repository';
import { AppModule } from './../src/app.module';
import { setupApplication } from './../src/setup-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;
  let refreshToken: string;
  let usersRepository: {
    ensureSeedAdmin: jest.Mock;
    findByEmail: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    countAll: jest.Mock;
    countByStatus: jest.Mock;
  };
  let contactsRepository: {
    create: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    updateWorkflow: jest.Mock;
    countAll: jest.Mock;
    countByStatus: jest.Mock;
  };
  let uploadsRepository: {
    create: jest.Mock;
    countAll: jest.Mock;
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
    accessToken = '';
    refreshToken = '';

    const refreshSessions = new Map<string, {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      revokedAt: Date | null;
      userAgent?: string;
      ipAddress?: string;
    }>();

    usersRepository = {
      ensureSeedAdmin: jest.fn(),
      findByEmail: jest.fn().mockImplementation(async (email: string) => ({
        id: 'db-admin-id',
        email,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q',
      })),
      findById: jest.fn().mockResolvedValue({
        id: 'db-admin-id',
        email: 'admin@fratelanza.com',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      }),
      findAll: jest.fn().mockResolvedValue([
        [
          {
            id: 'db-admin-id',
            email: 'admin@fratelanza.com',
            role: Role.SUPER_ADMIN,
            status: UserStatus.ACTIVE,
            createdAt: new Date('2026-05-24T09:00:00.000Z'),
            updatedAt: new Date('2026-05-24T09:00:00.000Z'),
          },
        ],
        1,
      ]),
      create: jest.fn().mockImplementation(async (payload) => ({
        id: 'user-1',
        createdAt: new Date('2026-05-24T09:00:00.000Z'),
        updatedAt: new Date('2026-05-24T09:00:00.000Z'),
        ...payload,
      })),
      update: jest.fn().mockImplementation(async (id, payload) => ({
        id,
        email: payload.email ?? 'editor@fratelanza.com',
        role: payload.role ?? Role.ADMIN,
        status: payload.status ?? UserStatus.ACTIVE,
        createdAt: new Date('2026-05-24T09:00:00.000Z'),
        updatedAt: new Date('2026-05-24T11:00:00.000Z'),
      })),
      countAll: jest.fn().mockResolvedValue(2),
      countByStatus: jest.fn().mockImplementation(async (status: UserStatus) =>
        status === UserStatus.ACTIVE ? 2 : 0,
      ),
    };

    contactsRepository = {
      create: jest.fn().mockImplementation(async (payload) => ({
        id: 'contact-1',
        status: ContactStatus.PENDING,
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        updatedAt: new Date('2026-05-24T10:00:00.000Z'),
        ...payload,
      })),
      findAll: jest.fn().mockResolvedValue([
        [
          {
            id: 'contact-1',
            name: 'Ahmed Ali',
            email: 'ahmed@example.com',
            phone: null,
            company: null,
            subject: 'Partnership inquiry',
            message: 'We need more information about your services.',
            status: ContactStatus.PENDING,
            handledBy: null,
            createdAt: new Date('2026-05-24T10:00:00.000Z'),
            updatedAt: new Date('2026-05-24T10:00:00.000Z'),
          },
        ],
        1,
      ]),
      findById: jest.fn().mockResolvedValue({
        id: 'contact-1',
        name: 'Ahmed Ali',
        email: 'ahmed@example.com',
        phone: null,
        company: null,
        subject: 'Partnership inquiry',
        message: 'We need more information about your services.',
        status: ContactStatus.PENDING,
        handledBy: null,
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        updatedAt: new Date('2026-05-24T10:00:00.000Z'),
      }),
      updateWorkflow: jest.fn().mockImplementation(async (_id, payload) => ({
        id: 'contact-1',
        name: 'Ahmed Ali',
        email: 'ahmed@example.com',
        phone: null,
        company: null,
        subject: 'Partnership inquiry',
        message: 'We need more information about your services.',
        status: payload.status ?? ContactStatus.PENDING,
        handledBy: payload.handledById
          ? {
              id: payload.handledById,
              email: 'admin@fratelanza.com',
              role: Role.SUPER_ADMIN,
              status: UserStatus.ACTIVE,
            }
          : null,
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        updatedAt: new Date('2026-05-24T11:00:00.000Z'),
      })),
      countAll: jest.fn().mockResolvedValue(1),
      countByStatus: jest.fn().mockImplementation(async (status: ContactStatus) =>
        status === ContactStatus.PENDING ? 1 : 0,
      ),
    };

    uploadsRepository = {
      create: jest.fn().mockImplementation(async (payload) => ({
        id: 'upload-1',
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        ...payload,
      })),
      countAll: jest.fn().mockResolvedValue(3),
    };

    refreshSessionsRepository = {
      create: jest.fn().mockImplementation(async (payload) => {
        const session = {
          ...payload,
          revokedAt: null,
        };

        refreshSessions.set(payload.id, session);
        return session;
      }),
      findById: jest.fn().mockImplementation(async (id: string) => refreshSessions.get(id) ?? null),
      rotate: jest.fn().mockImplementation(
        async (
          id: string,
          tokenHash: string,
          expiresAt: Date,
          userAgent?: string,
          ipAddress?: string,
        ) => {
          const existing = refreshSessions.get(id);

          if (!existing) {
            return null;
          }

          const updated = {
            ...existing,
            tokenHash,
            expiresAt,
            revokedAt: null,
            userAgent,
            ipAddress,
          };

          refreshSessions.set(id, updated);
          return updated;
        },
      ),
      revoke: jest.fn().mockImplementation(async (id: string) => {
        const existing = refreshSessions.get(id);

        if (!existing) {
          return null;
        }

        const updated = {
          ...existing,
          revokedAt: new Date(),
        };

        refreshSessions.set(id, updated);
        return updated;
      }),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersRepository)
      .useValue(usersRepository)
      .overrideProvider(ContactsRepository)
      .useValue(contactsRepository)
      .overrideProvider(UploadsRepository)
      .useValue(uploadsRepository)
      .overrideProvider(RefreshSessionsRepository)
      .useValue(refreshSessionsRepository)
      .overrideProvider(AuditService)
      .useValue(auditService)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  const ensureAuthenticated = async () => {
    if (accessToken && refreshToken) {
      return;
    }

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@fratelanza.com',
        password: 'Fratelanza@2026',
      })
      .expect(201);

    accessToken = loginResponse.body.accessToken;
    refreshToken = loginResponse.body.refreshToken;
  };

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect({
        name: 'FRATELANZA Backend',
        status: 'ok',
        apiPrefix: '/api/v1',
        documentation: '/api/docs',
        health: '/api/v1/health/live',
        version: '1.0.0',
      });
  });

  it('/api/docs (GET)', () => {
    return request(app.getHttpServer()).get('/api/docs').expect(200);
  });

  it('/api/v1/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@fratelanza.com',
        password: 'Fratelanza@2026',
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user).toMatchObject({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
    });
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('/api/v1/auth/refresh (POST)', async () => {
    await ensureAuthenticated();

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user).toMatchObject({
      id: 'db-admin-id',
      email: 'admin@fratelanza.com',
      role: Role.SUPER_ADMIN,
    });
    expect(refreshSessionsRepository.rotate).toHaveBeenCalledTimes(1);

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('/api/v1/admin/overview (GET) should reject anonymous access', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .expect(401);
  });

  it('/api/v1/admin/overview (GET) should allow authenticated admin access', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('/api/v1/contacts (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/contacts')
      .send({
        name: 'Ahmed Ali',
        email: 'ahmed@example.com',
        subject: 'Partnership inquiry',
        message: 'We need more information about your services.',
      })
      .expect(201);
  });

  it('/api/v1/auth/me (GET)', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        id: 'db-admin-id',
        email: 'admin@fratelanza.com',
        role: Role.SUPER_ADMIN,
      });
  });

  it('/api/v1/dashboard/summary (GET)', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({
        auth: 'database-backed',
        contacts: {
          total: 1,
          pending: 1,
          inProgress: 0,
          resolved: 0,
        },
        uploads: {
          total: 3,
        },
        users: {
          total: 2,
          active: 2,
          inactive: 0,
        },
        database: 'prisma-postgresql',
        adminPanel: 'protected',
      });
  });

  it('/api/v1/admin/users (GET)', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.meta).toMatchObject({
          total: 1,
          page: 1,
          limit: 10,
        });
      });
  });

  it('/api/v1/admin/users (POST)', async () => {
    await ensureAuthenticated();

    usersRepository.findByEmail.mockImplementation(async (email: string) => {
      if (email === 'new.user@fratelanza.com') {
        return null;
      }

      return {
        id: 'db-admin-id',
        email,
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q',
      };
    });

    return request(app.getHttpServer())
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'new.user@fratelanza.com',
        password: 'StrongPassword@2026',
        role: Role.EDITOR,
      })
      .expect(201);
  });

  it('/api/v1/contacts (GET)', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .get('/api/v1/contacts?status=PENDING&search=Ahmed')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.meta).toMatchObject({
          total: 1,
          page: 1,
          limit: 10,
        });
      });
  });

  it('/api/v1/contacts/:id/workflow (PATCH)', async () => {
    await ensureAuthenticated();

    return request(app.getHttpServer())
      .patch('/api/v1/contacts/contact-1/workflow')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        status: ContactStatus.IN_PROGRESS,
        handledById: 'db-admin-id',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(ContactStatus.IN_PROGRESS);
        expect(response.body.handledBy.id).toBe('db-admin-id');
      });
  });

  it('/api/v1/auth/logout (POST)', async () => {
    await ensureAuthenticated();

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200)
      .expect({ success: true });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    accessToken = '';
    refreshToken = '';
  });

  afterEach(async () => {
    await app.close();
  });
});
