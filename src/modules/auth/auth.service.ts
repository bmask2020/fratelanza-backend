import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/auth/roles.enum';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { RefreshSessionsRepository } from '../../database/repositories/refresh-sessions.repository';
import { UsersRepository } from '../../database/repositories/users.repository';
import { AuditService } from '../../common/audit/audit.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

interface AuthRequestContext {
  userAgent?: string;
  ipAddress?: string;
}

interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: Role;
  sid: string;
}

type JwtExpiry = `${number}${'m' | 'h' | 'd'}`;

const DEFAULT_ADMIN = {
  email: 'admin@fratelanza.com',
  role: Role.SuperAdmin,
  passwordHash: '$2b$10$cXcpFQdoEHfkf9uqeYcCG.YbMpmDpM4ejVATslMIURj3/8u5Jnp.q',
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly refreshSessionsRepository: RefreshSessionsRepository,
    private readonly auditService: AuditService,
  ) {}

  async signIn(
    loginDto: LoginDto,
    context: AuthRequestContext,
  ): Promise<AuthResponseDto> {
    const configuredAdminEmail =
      this.configService.get<string>('ADMIN_EMAIL') ?? DEFAULT_ADMIN.email;
    const configuredPasswordHash =
      this.configService.get<string>('ADMIN_PASSWORD_HASH') ??
      DEFAULT_ADMIN.passwordHash;

    await this.usersRepository.ensureSeedAdmin(
      configuredAdminEmail,
      configuredPasswordHash,
    );

    const userRecord = await this.usersRepository.findByEmail(
      loginDto.email.toLowerCase(),
    );

    const isValidEmail = Boolean(userRecord);
    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      userRecord?.passwordHash ?? configuredPasswordHash,
    );

    if (!userRecord || !isValidEmail || !isValidPassword) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user: AuthenticatedUser = {
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role as Role,
    };

    const authTokens = await this.createSessionTokens(user, context);

    await this.auditService.record({
      action: 'auth.login',
      actorId: user.userId,
      entityType: 'auth_session',
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return {
      accessToken: authTokens.accessToken,
      refreshToken: authTokens.refreshToken,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshSession(
    refreshToken: string,
    context: AuthRequestContext,
  ): Promise<AuthResponseDto> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.refreshSessionsRepository.findById(payload.sid);

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const matches = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!matches) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const userRecord = await this.usersRepository.findById(payload.sub);

    if (!userRecord) {
      throw new UnauthorizedException('User account was not found.');
    }

    const user: AuthenticatedUser = {
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role as Role,
    };

    const authTokens = await this.rotateSessionTokens(user, session.id, context);

    await this.auditService.record({
      action: 'auth.refresh',
      actorId: user.userId,
      entityType: 'auth_session',
      entityId: session.id,
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return {
      accessToken: authTokens.accessToken,
      refreshToken: authTokens.refreshToken,
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.refreshSessionsRepository.findById(payload.sid);

    if (session && !session.revokedAt) {
      const matches = await bcrypt.compare(refreshToken, session.tokenHash);

      if (matches) {
        await this.refreshSessionsRepository.revoke(session.id);
        await this.auditService.record({
          action: 'auth.logout',
          actorId: payload.sub,
          entityType: 'auth_session',
          entityId: session.id,
        });
      }
    }

    return { success: true };
  }

  async getProfile(user: AuthenticatedUser) {
    const storedUser = await this.usersRepository.findById(user.userId);

    if (!storedUser) {
      throw new UnauthorizedException('User account was not found.');
    }

    return {
      id: storedUser.id,
      email: storedUser.email,
      role: storedUser.role,
    };
  }

  private getAccessSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'fratelanza-access-secret-dev'
    );
  }

  private getRefreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'fratelanza-refresh-secret-dev'
    );
  }

  private getAccessExpiresIn(): JwtExpiry {
    return (
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m'
    ) as JwtExpiry;
  }

  private getRefreshExpiresIn(): JwtExpiry {
    return (
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d'
    ) as JwtExpiry;
  }

  private async createSessionTokens(
    user: AuthenticatedUser,
    context: AuthRequestContext,
  ) {
    const sessionId = randomUUID();
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        sid: sessionId,
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = this.resolveExpiryDate(this.getRefreshExpiresIn());

    await this.refreshSessionsRepository.create({
      id: sessionId,
      userId: user.userId,
      tokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn(),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async rotateSessionTokens(
    user: AuthenticatedUser,
    sessionId: string,
    context: AuthRequestContext,
  ) {
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
        sid: sessionId,
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: this.getRefreshExpiresIn(),
      },
    );

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = this.resolveExpiryDate(this.getRefreshExpiresIn());

    await this.refreshSessionsRepository.rotate(
      sessionId,
      tokenHash,
      expiresAt,
      context.userAgent,
      context.ipAddress,
    );

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.userId,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.getAccessSecret(),
        expiresIn: this.getAccessExpiresIn(),
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return (await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getRefreshSecret(),
      })) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid.');
    }
  }

  private resolveExpiryDate(expiresIn: JwtExpiry): Date {
    const now = Date.now();
    const value = Number.parseInt(expiresIn.slice(0, -1), 10);
    const unit = expiresIn.at(-1);

    if (Number.isNaN(value)) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }

    const multipliers: Record<string, number> = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(now + value * (multipliers[unit ?? 'd'] ?? multipliers.d));
  }
}
