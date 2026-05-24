import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface CreateAuditLogInput {
  action: string;
  actorId?: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.JsonValue;
}

@Injectable()
export class AuditLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        ...(input.actorId ? { actorId: input.actorId } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }
}
