import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { ContactsRepository } from '../../database/repositories/contacts.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [AuditModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository, UsersRepository],
})
export class ContactsModule {}
