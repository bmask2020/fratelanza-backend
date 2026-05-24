import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return backend metadata', () => {
      expect(appController.getRoot()).toEqual({
        name: 'FRATELANZA Backend',
        status: 'ok',
        apiPrefix: '/api/v1',
        documentation: '/api/docs',
        health: '/api/v1/health/live',
        version: '1.0.0',
      });
    });
  });
});
