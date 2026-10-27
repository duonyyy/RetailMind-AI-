import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from './entities/inventory.entity';
import { Store } from './entities/store.entity';
import { InventoryService } from './services/inventory.service';
import { InventoryController } from './inventory.controller';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: isDbEnabled ? [TypeOrmModule.forFeature([Inventory, Store])] : [],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
