import { Injectable } from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
}

interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  role?: Role;
  status?: UserStatus;
}

interface ListUsersInput {
  role?: Role;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  create(input: CreateUserInput) {
    return this.prisma.user.create({
      data: input,
    });
  }

  findAll(filters: ListUsersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const where: Prisma.UserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            email: {
              contains: filters.search,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  update(id: string, input: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id },
      data: input,
    });
  }

  countAll() {
    return this.prisma.user.count();
  }

  countByStatus(status: UserStatus) {
    return this.prisma.user.count({
      where: { status },
    });
  }

  async ensureSeedAdmin(email: string, passwordHash: string) {
    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      return existingUser;
    }

    return this.create({
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
  }
}
