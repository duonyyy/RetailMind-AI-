import { Module } from '@nestjs/common';
import { InternalAgentService } from './internal-agent.service';
import { InternalAgentController } from './internal-agent.controller';
import { CatalogModule } from '../catalog/public-api';
import { InventoryModule } from '../inventory/public-api';
import { OrdersModule } from '../orders/public-api';
import { KnowledgeModule } from '../knowledge/public-api';
import { SupportModule } from '../support/public-api';
import { CustomersModule } from '../customers/public-api';
import { CartModule } from '../cart/public-api';
import { AuthModule } from '../auth/public-api';
import { InternalUserGuard } from './internal-user.guard';

import { InternalSecretGuard } from '../../shared/guards/internal-secret.guard';

@Module({
  imports: [
    CatalogModule,
    InventoryModule,
    OrdersModule,
    KnowledgeModule,
    SupportModule,
    CustomersModule,
    CartModule,
    AuthModule,
  ],
  controllers: [InternalAgentController],
  providers: [InternalAgentService, InternalSecretGuard, InternalUserGuard],
  exports: [InternalAgentService],
})
export class InternalAgentModule {}
