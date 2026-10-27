import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './shared/redis/redis.module';
import { MinioStorageModule } from './shared/storage/minio.module';
import { QueueConfigModule } from './shared/queue/queue.module';
import { IngestionFeatureModule } from './features/ingestion/public-api';

/**
 * WorkerModule — Module độc lập dành riêng cho Headless Background Worker
 * Học tập từ Foodee Core-API: Không import các HTTP Controller, GraphQL hay Webhook,
 * chỉ tải hạ tầng Queue, Storage, Broker và các Job Processors.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    MinioStorageModule,
    QueueConfigModule,
    IngestionFeatureModule,
  ],
})
export class WorkerModule {}
