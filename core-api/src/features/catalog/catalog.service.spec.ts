import { Test, TestingModule } from '@nestjs/testing';
import { CatalogService } from './catalog.service';

describe('CatalogService (Laptops Filter & Specs)', () => {
  let catalogService: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogService],
    }).compile();

    catalogService = module.get<CatalogService>(CatalogService);
  });

  it('should find laptops under 20M VND with RAM >= 16GB', async () => {
    const results = await catalogService.getProducts({
      maxPrice: '20000000',
      minRam: 16,
    });

    expect(results.length).toBeGreaterThanOrEqual(3);
    for (const laptop of results) {
      expect(laptop.ramGb).toBeGreaterThanOrEqual(16);
      expect(parseInt(laptop.priceVnd, 10)).toBeLessThanOrEqual(20000000);
    }
  });

  it('should lookup variant by SKU', async () => {
    const laptop = await catalogService.getProductBySku('LT-ASUS-VIVO15-OLED');
    expect(laptop).toBeDefined();
    expect(laptop.name).toContain('Asus Vivobook 15');
    expect(laptop.priceVnd).toBe('17990000');
  });

  it('should compare multiple laptops side-by-side', async () => {
    const comparison = await catalogService.compareVariants([
      'LT-ASUS-VIVO15-OLED',
      'LT-DELL-INSP14-5430',
    ]);
    expect(comparison.length).toBe(2);
    expect(comparison[0].sku).toBe('LT-ASUS-VIVO15-OLED');
    expect(comparison[1].sku).toBe('LT-DELL-INSP14-5430');
  });
});
