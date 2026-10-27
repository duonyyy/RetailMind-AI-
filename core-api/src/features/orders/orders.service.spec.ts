import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { CatalogService } from '../catalog/catalog.service';
import { InventoryService } from '../inventory/services/inventory.service';
import { ConflictException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('OrdersService (SSOT Commerce & Decimal Precision)', () => {
  let ordersService: OrdersService;
  let catalogService: CatalogService;
  let inventoryService: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        CatalogService,
        InventoryService,
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    catalogService = module.get<CatalogService>(CatalogService);
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  it('should calculate preview with exact Decimal precision and VAT', async () => {
    const items = [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }];
    const preview = await ordersService.calculatePreview(items);

    expect(preview.subtotalVnd).toBe('17990000');
    // VAT 10% of 17,990,000 = 1,799,000
    expect(preview.vatVnd).toBe('1799000');
    // Total = 17,990,000 + 1,799,000 = 19,789,000
    expect(preview.totalVnd).toBe('19789000');
    expect(preview.items.length).toBe(1);
    expect(preview.items[0].name).toContain('Asus Vivobook');
  });

  it('should apply discount code MWG_VIP500 correctly', async () => {
    const items = [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }];
    const preview = await ordersService.calculatePreview(items, 'MWG_VIP500');

    expect(preview.discountVnd).toBe('500000');
    // Subtotal after discount = 17,990,000 - 500,000 = 17,490,000
    // VAT 10% = 1,749,000
    expect(preview.vatVnd).toBe('1749000');
    // Total = 17,490,000 + 1,749,000 = 19,239,000
    expect(preview.totalVnd).toBe('19239000');
  });

  it('should enforce idempotency protection and prevent double-order creation', async () => {
    const idempotencyKey = 'idem-key-test-999';
    const dto = {
      storeId: 'store-hcm-q1',
      customerId: 'cust-test-01',
      items: [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }],
    };

    // First checkout call
    const order1 = await ordersService.checkout(dto, idempotencyKey);
    expect(order1.orderNo).toBeDefined();
    expect(order1.status).toBe('placed');

    // Second checkout call with identical idempotencyKey
    const order2 = await ordersService.checkout(dto, idempotencyKey);
    // Must return the exact same order instance without duplicate booking
    expect(order2.orderId).toBe(order1.orderId);
    expect(order2.orderNo).toBe(order1.orderNo);
  });
});
