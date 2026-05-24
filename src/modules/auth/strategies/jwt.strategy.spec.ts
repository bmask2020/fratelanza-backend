import { ConfigService } from '@nestjs/config';
import { Role } from '../../../common/auth/roles.enum';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let configService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn(),
    };
  });

  it('uses the configured JWT access secret', (done) => {
    configService.get.mockReturnValue('configured-access-secret');

    const strategy = new JwtStrategy(configService as unknown as ConfigService) as unknown as {
      _secretOrKeyProvider: (
        request: unknown,
        rawJwtToken: string,
        callback: (error: Error | null, secret?: string) => void,
      ) => void;
    };

    strategy._secretOrKeyProvider({}, 'token', (error, secret) => {
      expect(error).toBeNull();
      expect(secret).toBe('configured-access-secret');
      done();
    });
  });

  it('falls back to the development JWT secret when config is missing', (done) => {
    configService.get.mockReturnValue(undefined);

    const strategy = new JwtStrategy(configService as unknown as ConfigService) as unknown as {
      _secretOrKeyProvider: (
        request: unknown,
        rawJwtToken: string,
        callback: (error: Error | null, secret?: string) => void,
      ) => void;
    };

    strategy._secretOrKeyProvider({}, 'token', (error, secret) => {
      expect(error).toBeNull();
      expect(secret).toBe('fratelanza-access-secret-dev');
      done();
    });
  });

  it('maps the JWT payload to the authenticated user shape', () => {
    const strategy = new JwtStrategy(configService as unknown as ConfigService);

    expect(
      strategy.validate({
        sub: 'user-1',
        email: 'admin@fratelanza.com',
        role: Role.SuperAdmin,
      }),
    ).toEqual({
      userId: 'user-1',
      email: 'admin@fratelanza.com',
      role: Role.SuperAdmin,
    });
  });
});