import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../../database/repositories/users.repository';
import { PaginatedResult, paginate } from '../../common/pagination/paginate';
import { AuditService } from '../../common/audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserView {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserView> {
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email.toLowerCase(),
    );

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.usersRepository.create({
      email: createUserDto.email.toLowerCase(),
      passwordHash,
      role: createUserDto.role ?? Role.EDITOR,
      status: createUserDto.status ?? UserStatus.ACTIVE,
    });

    await this.auditService.record({
      action: 'users.create',
      actorId: user.id,
      entityType: 'user',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
      },
    });

    return this.toUserView(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedResult<UserView>> {
    const [users, total] = await this.usersRepository.findAll(query);

    return paginate(
      users.map((user) => this.toUserView(user)),
      query.page,
      query.limit,
      total,
    );
  }

  async findOne(id: string): Promise<UserView> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User was not found.');
    }

    return this.toUserView(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserView> {
    if (Object.keys(updateUserDto).length === 0) {
      throw new BadRequestException('At least one field is required for update.');
    }

    const existingUser = await this.usersRepository.findById(id);

    if (!existingUser) {
      throw new NotFoundException('User was not found.');
    }

    if (updateUserDto.email) {
      const emailOwner = await this.usersRepository.findByEmail(
        updateUserDto.email.toLowerCase(),
      );

      if (emailOwner && emailOwner.id !== id) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    const passwordHash = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;

    const updatedUser = await this.usersRepository.update(id, {
      email: updateUserDto.email?.toLowerCase(),
      passwordHash,
      role: updateUserDto.role,
      status: updateUserDto.status,
    });

    await this.auditService.record({
      action: 'users.update',
      actorId: updatedUser.id,
      entityType: 'user',
      entityId: updatedUser.id,
      metadata: {
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });

    return this.toUserView(updatedUser);
  }

  private toUserView(user: {
    id: string;
    email: string;
    role: Role;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
  }): UserView {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
