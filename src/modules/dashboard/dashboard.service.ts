import { Injectable } from '@nestjs/common';
import { ContactStatus, UserStatus } from '@prisma/client';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import { UsersRepository } from '../../database/repositories/users.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly uploadsRepository: UploadsRepository,
  ) {}

  async getSummary() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalContacts,
      pendingContacts,
      inProgressContacts,
      resolvedContacts,
      totalUploads,
    ] = await Promise.all([
      this.usersRepository.countAll(),
      this.usersRepository.countByStatus(UserStatus.ACTIVE),
      this.usersRepository.countByStatus(UserStatus.INACTIVE),
      this.contactsRepository.countAll(),
      this.contactsRepository.countByStatus(ContactStatus.PENDING),
      this.contactsRepository.countByStatus(ContactStatus.IN_PROGRESS),
      this.contactsRepository.countByStatus(ContactStatus.RESOLVED),
      this.uploadsRepository.countAll(),
    ]);

    return {
      auth: 'database-backed',
      contacts: {
        total: totalContacts,
        pending: pendingContacts,
        inProgress: inProgressContacts,
        resolved: resolvedContacts,
      },
      uploads: {
        total: totalUploads,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
      },
      database: 'prisma-postgresql',
      adminPanel: 'protected',
    };
  }
}
