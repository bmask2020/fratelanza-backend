import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsRepository } from '../../database/repositories/audit-logs.repository';

interface AuditEntry {
  action: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditLogsRepository: AuditLogsRepository) {}

  async record(entry: AuditEntry) {
    await this.auditLogsRepository.create(entry);
    this.logger.log(JSON.stringify({
      type: 'audit',
      ...entry,
    }));
  }
}
