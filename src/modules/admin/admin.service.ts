import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  getOverview() {
    return {
      status: 'ready',
      panels: ['users', 'contacts-workflow', 'uploads', 'dashboard', 'integrations'],
      notes:
        'Admin APIs are backed by Prisma repositories and protected by JWT and role guards.',
    };
  }
}
