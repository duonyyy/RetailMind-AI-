import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { assertProductionConfiguration } from './config/production-config.guard';

async function bootstrap() {
  assertProductionConfiguration();
  const app = await NestFactory.create(AppModule);

  // 1. CORS Configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 2. Global Route Prefix: /api/v1
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/health'],
  });

  // 3. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: false,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[RetailMind AI] Commerce Core Backend running on port ${port} (Prefix: /api/v1)`);
}

bootstrap();
