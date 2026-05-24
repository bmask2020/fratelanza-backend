import { Injectable } from '@nestjs/common';
import { API_PREFIX, SWAGGER_PATH } from './constants';

@Injectable()
export class AppService {
  getMetadata() {
    return {
      name: 'FRATELANZA Backend',
      status: 'ok',
      apiPrefix: `/${API_PREFIX}`,
      documentation: `/${SWAGGER_PATH}`,
      health: '/api/v1/health/live',
      version: '1.0.0',
    };
  }
}
