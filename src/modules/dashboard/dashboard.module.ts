import { Module } from '@nestjs/common';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UploadsRepository } from '../../database/repositories/uploads.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, UsersRepository, ContactsRepository, UploadsRepository],
})
export class DashboardModule {}
