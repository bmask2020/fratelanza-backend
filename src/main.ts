import { NestFactory } from '@nestjs/core';
import { MonitoringService } from './common/monitoring/monitoring.service';
import { registerProcessErrorHandlers } from './common/monitoring/process-error-hooks';
import { AppModule } from './app.module';
import { setupApplication } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  registerProcessErrorHandlers(app.get(MonitoringService));
  setupApplication(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
