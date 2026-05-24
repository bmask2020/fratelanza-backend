import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let adminController: AdminController;
  let adminService: {
    getOverview: jest.Mock;
  };

  beforeEach(() => {
    adminService = {
      getOverview: jest.fn().mockReturnValue({ dashboard: true, users: true }),
    };

    adminController = new AdminController(adminService as unknown as AdminService);
  });

  it('returns the admin overview from the service', () => {
    expect(adminController.getOverview()).toEqual({ dashboard: true, users: true });
    expect(adminService.getOverview).toHaveBeenCalledTimes(1);
  });
});