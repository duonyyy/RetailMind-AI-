import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { assertProductionConfiguration } from './config/production-config.guard';
import { WorkerModule } from './worker.module';

/**
 * Headless Worker Entrypoint
 * Học tập từ Foodee Core-API: Chạy BullMQ Consumer & Ingestion Processors
 * trên tiến trình độc lập không chiếm dụng cổng HTTP (No HTTP port binding).
 */
async function bootstrapWorker(): Promise<void> {
  // 1. Kiểm tra nghiêm ngặt biến môi trường production
  assertProductionConfiguration();

  // 2. Khởi tạo ApplicationContext (Headless, không mở cổng HTTP)
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  // 3. Kích hoạt Shutdown Hooks để xử lý Graceful Shutdown khi nhận SIGTERM/SIGINT
  app.enableShutdownHooks();

  const logger = new Logger('RetailMindHeadlessWorker');
  logger.log({
    event: 'headless_worker_started',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    purpose: 'BullMQ Queue Processor & Background Document Ingestion',
  });
}

bootstrapWorker().catch((error: unknown) => {
  console.error('[FATAL] Lỗi khi khởi động RetailMind Headless Worker:', error);
  process.exit(1);
});
