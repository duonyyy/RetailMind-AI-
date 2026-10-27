import { Module } from '@nestjs/common';
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
