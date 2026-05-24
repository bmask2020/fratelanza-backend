import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get backend service metadata' })
  @ApiOkResponse({
    description: 'Returns the current backend metadata and documentation entrypoint.',
  })
  getRoot() {
    return this.appService.getMetadata();
  }
}
