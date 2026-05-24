import { Role } from '../../common/auth/roles.enum';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: {
    signIn: jest.Mock;
    refreshSession: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      signIn: jest.fn().mockResolvedValue({ accessToken: 'access-token' }),
      refreshSession: jest.fn().mockResolvedValue({ accessToken: 'next-access-token' }),
      logout: jest.fn().mockResolvedValue({ success: true }),
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'admin@fratelanza.com',
        role: Role.SuperAdmin,
      }),
    };

    authController = new AuthController(authService as unknown as AuthService);
  });

  it('delegates login with request context', async () => {
    const loginDto = {
      email: 'admin@fratelanza.com',
      password: 'Fratelanza@2026',
    };
    const request = {
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
    };

    await expect(authController.signIn(request as never, loginDto)).resolves.toEqual({
      accessToken: 'access-token',
    });
    expect(authService.signIn).toHaveBeenCalledWith(loginDto, {
      userAgent: 'jest',
      ipAddress: '127.0.0.1',
    });
  });

  it('delegates refresh with request context', async () => {
    const request = {
      headers: { 'user-agent': 'jest-refresh' },
      ip: '127.0.0.2',
    };

    await expect(
      authController.refresh(request as never, { refreshToken: 'refresh-token' }),
    ).resolves.toEqual({
      accessToken: 'next-access-token',
    });
    expect(authService.refreshSession).toHaveBeenCalledWith('refresh-token', {
      userAgent: 'jest-refresh',
      ipAddress: '127.0.0.2',
    });
  });

  it('delegates logout with the refresh token only', async () => {
    await expect(
      authController.logout({ refreshToken: 'refresh-token' }),
    ).resolves.toEqual({ success: true });
    expect(authService.logout).toHaveBeenCalledWith('refresh-token');
  });

  it('delegates profile lookup with the authenticated user', async () => {
    const request = {
      user: {
        userId: 'user-1',
        email: 'admin@fratelanza.com',
        role: Role.SuperAdmin,
      },
    };

    await expect(authController.getProfile(request as never)).resolves.toEqual({
      id: 'user-1',
      email: 'admin@fratelanza.com',
      role: Role.SuperAdmin,
    });
    expect(authService.getProfile).toHaveBeenCalledWith(request.user);
  });
});