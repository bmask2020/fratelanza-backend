import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser } from '../types/authenticated-user';
import { Role } from './roles.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let rolesGuard: RolesGuard;
  let reflector: {
    getAllAndOverride: jest.Mock;
  };

  const createContext = (user?: AuthenticatedUser) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as never;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };

    rolesGuard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(rolesGuard.canActivate(createContext())).toBe(true);
  });

  it('throws when roles are required but the request is anonymous', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin]);

    expect(() => rolesGuard.canActivate(createContext())).toThrow(
      new UnauthorizedException('Authentication is required.'),
    );
  });

  it('allows access when the user role matches the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.Admin, Role.SuperAdmin]);

    expect(
      rolesGuard.canActivate(
        createContext({
          userId: 'user-1',
          email: 'admin@fratelanza.com',
          role: Role.Admin,
        }),
      ),
    ).toBe(true);
  });

  it('rejects access when the user role is not allowed', () => {
    reflector.getAllAndOverride.mockReturnValue([Role.SuperAdmin]);

    expect(
      rolesGuard.canActivate(
        createContext({
          userId: 'user-1',
          email: 'editor@fratelanza.com',
          role: Role.Editor,
        }),
      ),
    ).toBe(false);
  });
});