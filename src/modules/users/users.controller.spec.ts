import { Role, UserStatus } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      create: jest.fn().mockResolvedValue({ id: 'user-1' }),
      findAll: jest.fn().mockResolvedValue({ items: [], meta: { total: 0 } }),
      findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
      update: jest.fn().mockResolvedValue({ id: 'user-1', role: Role.ADMIN }),
    };

    usersController = new UsersController(usersService as unknown as UsersService);
  });

  it('creates a user through the service', async () => {
    const dto = {
      email: 'editor@fratelanza.com',
      password: 'StrongPassword@2026',
      role: Role.EDITOR,
      status: UserStatus.ACTIVE,
    };

    await expect(usersController.create(dto)).resolves.toEqual({ id: 'user-1' });
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });

  it('lists users through the service', async () => {
    const query = { page: 2, limit: 5, search: 'admin' };

    await expect(usersController.findAll(query as never)).resolves.toEqual({
      items: [],
      meta: { total: 0 },
    });
    expect(usersService.findAll).toHaveBeenCalledWith(query);
  });

  it('loads a single user by id', async () => {
    await expect(usersController.findOne('user-1')).resolves.toEqual({ id: 'user-1' });
    expect(usersService.findOne).toHaveBeenCalledWith('user-1');
  });

  it('updates a user by id', async () => {
    const dto = { role: Role.ADMIN };

    await expect(usersController.update('user-1', dto)).resolves.toEqual({
      id: 'user-1',
      role: Role.ADMIN,
    });
    expect(usersService.update).toHaveBeenCalledWith('user-1', dto);
  });
});