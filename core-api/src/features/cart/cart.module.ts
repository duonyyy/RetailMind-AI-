import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CatalogModule } from '../catalog/public-api';
import { InventoryModule } from '../inventory/public-api';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: [
    ...(isDbEnabled ? [TypeOrmModule.forFeature([Cart, CartItem])] : []),
    CatalogModule,
    InventoryModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
