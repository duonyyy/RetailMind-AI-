import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CatalogModule } from '../catalog/public-api';
import { InventoryModule } from '../inventory/public-api';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled
      ? [
          TypeOrmModule.forFeature([
            Order,
            OrderItem,
            Cart,
            CartItem,
            SupportTicket,
            IdempotencyKey,
          ]),
        ]
      : []),
    CatalogModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
