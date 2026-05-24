import { Module } from '@nestjs/common';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuditModule } from '../../common/audit/audit.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
