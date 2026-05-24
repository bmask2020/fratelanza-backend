import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let dashboardController: DashboardController;
  let dashboardService: {
    getSummary: jest.Mock;
  };

  beforeEach(() => {
    dashboardService = {
      getSummary: jest.fn().mockResolvedValue({ adminPanel: 'protected' }),
    };

    dashboardController = new DashboardController(
      dashboardService as unknown as DashboardService,
    );
  });

  it('returns the dashboard summary from the service', async () => {
    await expect(dashboardController.getSummary()).resolves.toEqual({
      adminPanel: 'protected',
    });
    expect(dashboardService.getSummary).toHaveBeenCalledTimes(1);
  });
});