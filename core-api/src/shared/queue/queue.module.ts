import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(config.get<string>('REDIS_PORT', '6379'), 10),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: () => null, // Không crash app nếu Redis chưa bật khi chạy offline/test
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueConfigModule {}
