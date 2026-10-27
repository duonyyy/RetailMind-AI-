import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variant } from './entities/variant.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';

const isDbEnabled = process.env.ENABLE_POSTGRES === 'true';

@Module({
  imports: isDbEnabled ? [TypeOrmModule.forFeature([Variant, Product, Category, Brand])] : [],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
