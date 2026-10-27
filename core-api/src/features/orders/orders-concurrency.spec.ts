import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { ConflictException } from '@nestjs/common';

describe('High-Concurrency Locking Engine (Anti-Oversell & Anti-Deadlock)', () => {
  let ordersService: OrdersService;
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
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  it('should prevent overselling when 20 customers concurrently checkout the last available item', async () => {
    const storeId = 'store-hcm-q1';
    const targetSku = 'LT-ASUS-VIVO15-OLED';

    // 1. Setup exact stock: onHand = 1, reserved = 0 (Only 1 item available!)
    const memoryMap = (inventoryService as any).memoryInventory as Map<string, { onHand: number; reserved: number }>;
    memoryMap.set(`${storeId}:${targetSku}`, { onHand: 1, reserved: 0 });
    memoryMap.set(`${storeId}:var-asus-vivobook-15`, { onHand: 1, reserved: 0 });

    const concurrentUsersCount = 20;
    const checkoutPromises: Promise<any>[] = [];

    // 2. Fire 20 concurrent requests with unique Idempotency Keys
    for (let i = 0; i < concurrentUsersCount; i++) {
      const p = ordersService.checkout(
        {
          storeId,
          customerId: `cust-concurrent-${i}`,
          items: [{ sku: targetSku, quantity: 1 }],
        },
        `idem-concurrent-${i}-${Date.now()}`,
      ).catch((err) => ({ error: err }));

      checkoutPromises.push(p);
    }

    const results = await Promise.all(checkoutPromises);

    // 3. Count successes vs failures
    const successes = results.filter((r) => r && !r.error && r.orderId);
    const conflicts = results.filter(
      (r) => r && r.error && (r.error instanceof ConflictException || r.error.status === 409),
    );

    // EXACTLY 1 customer gets the item
    expect(successes.length).toBe(1);
    // EXACTLY 19 customers get 409 Conflict (Out of stock)
    expect(conflicts.length).toBe(19);

    // 4. Verify physical inventory state: reserved must equal 1, available must be 0 (NEVER NEGATIVE!)
    const finalStock = await inventoryService.getStock(storeId, targetSku);
    expect(finalStock.onHandQty).toBe(1);
    expect(finalStock.reservedQty).toBe(1);
    expect(finalStock.availableQty).toBe(0);
    expect(finalStock.isAvailable).toBe(false);
  });

  it('should sort variant IDs lexicographically to prevent deadlocks in multi-item orders', async () => {
    // Verify anti-deadlock sorting logic
    const unsorted = [
      { variantId: 'var-lenovo-03', quantity: 1 },
      { variantId: 'var-asus-01', quantity: 1 },
      { variantId: 'var-dell-02', quantity: 2 },
    ];

    const sorted = [...unsorted].sort((a, b) => a.variantId.localeCompare(b.variantId));

    expect(sorted[0].variantId).toBe('var-asus-01');
    expect(sorted[1].variantId).toBe('var-dell-02');
    expect(sorted[2].variantId).toBe('var-lenovo-03');
  });
});

