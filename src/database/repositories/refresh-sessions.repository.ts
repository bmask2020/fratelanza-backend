import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface CreateRefreshSessionInput {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class RefreshSessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRefreshSessionInput) {
    return this.prisma.refreshSession.create({
      data: input,
    });
  }

  findById(id: string) {
    return this.prisma.refreshSession.findUnique({
      where: { id },
    });
  }

  rotate(
    id: string,
    tokenHash: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ) {
    return this.prisma.refreshSession.update({
      where: { id },
      data: {
        tokenHash,
        expiresAt,
        revokedAt: null,
        userAgent,
        ipAddress,
      },
    });
  }

  revoke(id: string) {
    return this.prisma.refreshSession.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
