import { ContactStatus, UserStatus } from '@prisma/client';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let usersRepository: {
    countAll: jest.Mock;
    countByStatus: jest.Mock;
  };
  let contactsRepository: {
    countAll: jest.Mock;
    countByStatus: jest.Mock;
  };
  let uploadsRepository: {
    countAll: jest.Mock;
  };

  beforeEach(() => {
    usersRepository = {
      countAll: jest.fn().mockResolvedValue(6),
      countByStatus: jest.fn().mockImplementation(async (status: UserStatus) =>
        status === UserStatus.ACTIVE ? 5 : 1,
      ),
    };

    contactsRepository = {
      countAll: jest.fn().mockResolvedValue(10),
      countByStatus: jest.fn().mockImplementation(
        async (status: ContactStatus) => {
          if (status === ContactStatus.PENDING) {
            return 4;
          }

          if (status === ContactStatus.IN_PROGRESS) {
            return 3;
          }

          return 3;
        },
      ),
    };

    uploadsRepository = {
      countAll: jest.fn().mockResolvedValue(12),
    };

    dashboardService = new DashboardService(
      usersRepository as unknown as UsersRepository,
      contactsRepository as unknown as ContactsRepository,
      uploadsRepository as unknown as UploadsRepository,
    );
  });

  it('returns aggregated Prisma-backed dashboard metrics', async () => {
    await expect(dashboardService.getSummary()).resolves.toEqual({
      auth: 'database-backed',
      contacts: {
        total: 10,
        pending: 4,
        inProgress: 3,
        resolved: 3,
      },
      uploads: {
        total: 12,
      },
      users: {
        total: 6,
        active: 5,
        inactive: 1,
      },
      database: 'prisma-postgresql',
      adminPanel: 'protected',
    });
  });
});
