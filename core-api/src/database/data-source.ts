import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// 1. Identity & Auth (2)
import { Role } from '../features/auth/entities/role.entity';
import { User } from '../features/auth/entities/user.entity';

// 2. Catalog (5)
import { Brand } from '../features/catalog/entities/brand.entity';
import { Category } from '../features/catalog/entities/category.entity';
import { Product } from '../features/catalog/entities/product.entity';
import { Variant } from '../features/catalog/entities/variant.entity';
import { ProductSpec } from '../features/catalog/entities/product-spec.entity';

// 3. Inventory (2)
import { Store } from '../features/inventory/entities/store.entity';
import { Inventory } from '../features/inventory/entities/inventory.entity';

// 4. Customers & Favorites (1)
import { Favorite } from '../features/customers/entities/favorite.entity';

// 5. Commerce & Orders (5)
import { Cart } from '../features/cart/entities/cart.entity';
import { CartItem } from '../features/cart/entities/cart-item.entity';
import { Order } from '../features/orders/entities/order.entity';
import { OrderItem } from '../features/orders/entities/order-item.entity';
import { IdempotencyKey } from '../features/orders/entities/idempotency-key.entity';

// 6. Agents & Conversations (2)
import { Conversation } from '../features/internal-agent/entities/conversation.entity';
import { Message } from '../features/internal-agent/entities/message.entity';

// 7. Knowledge & Policies (2)
import { Policy } from '../features/knowledge/entities/policy.entity';
import { DocumentVersion } from '../features/knowledge/entities/document-version.entity';

// 8. Ingestion (1)
import { IngestionJob } from '../features/ingestion/entities/ingestion-job.entity';

// 9. Support (1)
import { SupportTicket } from '../features/orders/entities/support-ticket.entity';

// 10. Audit (1)
import { AuditEvent } from '../features/audit/entities/audit-event.entity';

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
    Role,
    User,
    Brand,
    Category,
    Product,
    Variant,
    ProductSpec,
    Store,
    Inventory,
    Favorite,
    Cart,
    CartItem,
    Order,
    OrderItem,
    IdempotencyKey,
    Conversation,
    Message,
    Policy,
    DocumentVersion,
    IngestionJob,
    SupportTicket,
    AuditEvent,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});
