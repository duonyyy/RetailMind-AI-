import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from './features/catalog/public-api';
import { InventoryModule } from './features/inventory/public-api';
import { OrdersModule } from './features/orders/public-api';
import { InternalAgentModule } from './features/internal-agent/public-api';
import { AuthModule } from './features/auth/public-api';
import { RedisModule } from './shared/redis/redis.module';
import { MinioStorageModule } from './shared/storage/minio.module';
import { QueueConfigModule } from './shared/queue/queue.module';
import { IngestionFeatureModule } from './features/ingestion/public-api';
import { CustomersModule } from './features/customers/public-api';
import { KnowledgeModule } from './features/knowledge/public-api';
import { SupportModule } from './features/support/public-api';
import { AuditModule } from './features/audit/public-api';
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptor';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    MinioStorageModule,
    QueueConfigModule,
    ...(isDbEnabled
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || process.env.DB_USER || 'retailmind_user',
            password: process.env.DB_PASSWORD || 'secure_password_change_me',
            database: process.env.DB_DATABASE || process.env.DB_NAME || 'retailmind_db',
            autoLoadEntities: true,
            synchronize: false,
          }),
        ]
      : []),
    CatalogModule,
    InventoryModule,
    OrdersModule,
    InternalAgentModule,
    AuthModule,
    IngestionFeatureModule,
    CustomersModule,
    KnowledgeModule,
    SupportModule,
    AuditModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
