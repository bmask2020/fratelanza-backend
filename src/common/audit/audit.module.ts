import { Global, Module } from '@nestjs/common';
import { AuditLogsRepository } from '../../database/repositories/audit-logs.repository';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [AuditService, AuditLogsRepository],
  exports: [AuditService],
})
export class AuditModule {}
