import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CatalogModule } from '../catalog/public-api';
import { InventoryModule } from '../inventory/public-api';
import { CartModule } from '../cart/public-api';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled
      ? [
          TypeOrmModule.forFeature([
            Order,
            OrderItem,
            SupportTicket,
            IdempotencyKey,
          ]),
        ]
      : []),
    CatalogModule,
    InventoryModule,
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
