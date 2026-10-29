import { Public } from '../../shared/decorators/public.decorator';
import { Controller, Get, Query, Param } from '@nestjs/common';
import { CatalogService, LaptopFilter } from './catalog.service';

@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  async getProducts(
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRam') minRam?: string,
    @Query('brand') brand?: string,
    @Query('category') category?: string,
  ) {
    const filter: LaptopFilter = {
      search,
      minPrice,
      maxPrice,
      minRam: minRam ? parseInt(minRam, 10) : undefined,
      brand,
      category,
    };
    const items = await this.catalogService.getProducts(filter);
    return {
      items,
      total: items.length,
    };
  }

  @Get('products/:sku')
  async getProductBySku(@Param('sku') sku: string) {
    return this.catalogService.getProductBySku(sku);
  }

  @Get('compare')
  async compareProducts(@Query('skus') skus: string) {
    const skuList = (skus || '').split(',').map((s) => s.trim()).filter(Boolean);
    return this.catalogService.compareVariants(skuList);
  }
}
