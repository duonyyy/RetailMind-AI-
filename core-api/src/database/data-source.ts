import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Brand } from '../features/catalog/entities/brand.entity';
import { Category } from '../features/catalog/entities/category.entity';
import { Product } from '../features/catalog/entities/product.entity';
import { Variant } from '../features/catalog/entities/variant.entity';
import { Inventory } from '../features/inventory/entities/inventory.entity';
import { Store } from '../features/inventory/entities/store.entity';
import { Order } from '../features/orders/entities/order.entity';
import { OrderItem } from '../features/orders/entities/order-item.entity';
import { Cart } from '../features/orders/entities/cart.entity';
import { CartItem } from '../features/orders/entities/cart-item.entity';
import { SupportTicket } from '../features/orders/entities/support-ticket.entity';
import { IdempotencyKey } from '../features/orders/entities/idempotency-key.entity';
import { User } from '../features/auth/entities/user.entity';
import { Role } from '../features/auth/entities/role.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'retailmind_user',
  password: process.env.DB_PASSWORD || 'secure_password_change_me',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'retailmind_db',
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    Brand,
    Category,
    Product,
    Variant,
    Inventory,
    Store,
    Order,
    OrderItem,
    Cart,
    CartItem,
    SupportTicket,
    IdempotencyKey,
    User,
    Role,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});
