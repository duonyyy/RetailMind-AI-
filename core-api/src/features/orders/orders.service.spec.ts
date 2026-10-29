import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrdersService } from './orders.service';
import { CatalogService, Variant } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { createMockDataSource, createMockVariantRepository } from '../../test/test-bed.helper';

describe('OrdersService (SSOT Commerce & Decimal Precision)', () => {
  let ordersService: OrdersService;
  let catalogService: CatalogService;
  let inventoryService: InventoryService;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        CatalogService,
        InventoryService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: getRepositoryToken(Variant),
          useValue: createMockVariantRepository(),
        },
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
    expect(preview.previewToken).toBeDefined();
    expect(preview.expiresAt).toBeDefined();
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

  it('should validate Signed Preview Token during checkout', async () => {
    const items = [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }];
    const preview = await ordersService.calculatePreview(items, undefined, 'store-hcm-q1');

    // Valid checkout with preview token
    const order = await ordersService.checkout(
      {
        storeId: 'store-hcm-q1',
        items,
        previewToken: preview.previewToken,
      },
      'idem-token-valid-01',
    );
    expect(order.orderId).toBeDefined();

    // Tampered token checkout should be rejected
    const tamperedToken = `${preview.previewToken}tampered`;
    await expect(
      ordersService.checkout(
        {
          storeId: 'store-hcm-q1',
          items,
          previewToken: tamperedToken,
        },
        'idem-token-tamper-01',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should cancel confirmed order and prevent double cancellation', async () => {
    const order = await ordersService.checkout(
      {
        storeId: 'store-hcm-q1',
        items: [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }],
      },
      'idem-cancel-test-01',
    );

    const cancelRes = await ordersService.cancelOrder(order.orderId, 'Khách đổi ý');
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.status).toBe('CANCELLED');

    // Double cancel should throw ConflictException
    await expect(
      ordersService.cancelOrder(order.orderId, 'Hủy lần 2'),
    ).rejects.toThrow(ConflictException);
  });
});
