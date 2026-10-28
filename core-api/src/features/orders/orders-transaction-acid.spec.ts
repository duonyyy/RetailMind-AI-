import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { ConflictException } from '@nestjs/common';
import Decimal from 'decimal.js';

describe('OrdersService ACID Commerce Transaction & Idempotency Integration', () => {
  let ordersService: OrdersService;
  let catalogService: CatalogService;
  let inventoryService: InventoryService;

  describe('1. In-Memory Stock Restoration on Cancel Order', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [OrdersService, CatalogService, InventoryService],
      }).compile();

      ordersService = module.get<OrdersService>(OrdersService);
      catalogService = module.get<CatalogService>(CatalogService);
      inventoryService = module.get<InventoryService>(InventoryService);
    });

    it('should accurately restore reserved stock in memory when order is cancelled', async () => {
      const storeId = 'store-hcm-q1';
      const sku = 'LT-ASUS-VIVO15-OLED';

      // Initial stock
      const stockBefore = await inventoryService.getStock(storeId, sku);
      const initialReserved = stockBefore.reservedQty;

      // 1. Checkout
      const order = await ordersService.checkout(
        {
          storeId,
          customerId: 'cust-restore-01',
          items: [{ sku, quantity: 2 }],
        },
        'idem-key-restore-stock-test',
      );
      expect(order.status).toBe('placed');

      // Stock after checkout
      const stockAfterCheckout = await inventoryService.getStock(storeId, sku);
      expect(stockAfterCheckout.reservedQty).toBe(initialReserved + 2);

      // 2. Cancel order
      const cancelRes = await ordersService.cancelOrder(order.orderId, 'Khách hàng hủy đơn mua');
      expect(cancelRes.success).toBe(true);
      expect(cancelRes.status).toBe('CANCELLED');

      // Stock after cancellation: reservedQty must be restored back to initialReserved!
      const stockAfterCancel = await inventoryService.getStock(storeId, sku);
      expect(stockAfterCancel.reservedQty).toBe(initialReserved);
      expect(stockAfterCancel.availableQty).toBe(stockBefore.availableQty);
    });
  });

  describe('2. PostgreSQL Transaction: OrderItem & Idempotency Persistence', () => {
    let mockQueryRunner: Partial<QueryRunner>;
    let mockDataSource: Partial<DataSource>;
    let savedEntities: any[];
    let mockIdemRepo: Partial<Repository<IdempotencyKey>>;

    beforeEach(async () => {
      savedEntities = [];

      mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockImplementation((entityClass, plainObj) => {
            const instance = new entityClass();
            Object.assign(instance, plainObj);
            if (!instance.id) {
              instance.id = `mock-uuid-${Date.now()}-${Math.random()}`;
            }
            return instance;
          }),
          save: jest.fn().mockImplementation(async (entity) => {
            savedEntities.push(entity);
            return entity;
          }),
          createQueryBuilder: jest.fn(),
        } as any,
      };

      mockIdemRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      mockDataSource = {
        isInitialized: true,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner as QueryRunner),
        getRepository: jest.fn().mockReturnValue(mockIdemRepo as any),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
          CatalogService,
          InventoryService,
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();

      ordersService = module.get<OrdersService>(OrdersService);
      catalogService = module.get<CatalogService>(CatalogService);
      inventoryService = module.get<InventoryService>(InventoryService);
    });

    it('should persist Order, OrderItems and IdempotencyKey in a single ACID transaction during checkout', async () => {
      const reserveMultipleSpy = jest
        .spyOn(inventoryService, 'reserveMultipleWithLock')
        .mockResolvedValue(undefined);

      const dto = {
        storeId: 'store-hcm-q1',
        customerId: '00000000-0000-0000-0000-000000000002',
        items: [
          { sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 },
          { sku: 'LT-DELL-INSP14-5430', quantity: 2 },
        ],
      };
      const idempotencyKey = 'idem-acid-test-key-001';

      const result = await ordersService.checkout(dto, idempotencyKey);

      // Verify transaction flow
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(reserveMultipleSpy).toHaveBeenCalledWith(
        mockQueryRunner,
        'store-hcm-q1',
        [
          { variantId: 'LT-ASUS-VIVO15-OLED', quantity: 1 },
          { variantId: 'LT-DELL-INSP14-5430', quantity: 2 },
        ],
      );

      // 1. Check IdempotencyKey persistence
      const savedIdem = savedEntities.find((e) => e instanceof IdempotencyKey);
      expect(savedIdem).toBeDefined();
      expect(savedIdem.key).toBe(`${dto.customerId}:${idempotencyKey}`);
      expect(savedIdem.status).toBe('completed');
      expect(savedIdem.responsePayload.orderNo).toBe(result.orderNo);

      // 2. Check Order persistence
      const savedOrder = savedEntities.find((e) => e instanceof Order);
      expect(savedOrder).toBeDefined();
      expect(savedOrder.order_no).toBe(result.orderNo);
      expect(savedOrder.status).toBe('placed');
      expect(savedOrder.idempotency_key_id).toBe(savedIdem.id);

      // 3. Check OrderItem persistence
      const savedOrderItems = savedEntities.filter((e) => e instanceof OrderItem);
      expect(savedOrderItems.length).toBe(2);

      const asusItem = savedOrderItems.find((i) => i.sku_snapshot === 'LT-ASUS-VIVO15-OLED');
      expect(asusItem).toBeDefined();
      expect(asusItem.order_id).toBe(savedOrder.id);
      expect(asusItem.quantity).toBe(1);
      expect(new Decimal(asusItem.unit_price_vnd).toString()).toBe('17990000');
      expect(new Decimal(asusItem.line_total_vnd).toString()).toBe('17990000');

      const dellItem = savedOrderItems.find((i) => i.sku_snapshot === 'LT-DELL-INSP14-5430');
      expect(dellItem).toBeDefined();
      expect(dellItem.order_id).toBe(savedOrder.id);
      expect(dellItem.quantity).toBe(2);
      expect(new Decimal(dellItem.unit_price_vnd).toString()).toBe('18490000');
      expect(new Decimal(dellItem.line_total_vnd).toString()).toBe('36980000');

      // 4. Verify transaction commit
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should return cached response from PostgreSQL idempotency_keys without re-executing transaction', async () => {
      const cachedOrderResult = {
        orderId: 'ord-cached-123',
        orderNo: 'MWG-CACHED-999',
        status: 'placed',
        storeId: 'store-hcm-q1',
        customerId: 'cust-acid-02',
        totalVnd: '19789000',
        formattedTotal: '19.789.000 ₫',
        itemsCount: 1,
        confirmedAt: new Date().toISOString(),
        idempotencyKey: 'idem-cached-key-01',
      };

      (mockIdemRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'mock-idem-uuid',
        key: 'cust-acid-02:idem-cached-key-01',
        targetId: 'ord-cached-123',
        status: 'completed',
        responsePayload: cachedOrderResult,
      });

      const reserveSpy = jest.spyOn(inventoryService, 'reserveMultipleWithLock');

      const result = await ordersService.checkout(
        {
          storeId: 'store-hcm-q1',
          customerId: 'cust-acid-02',
          items: [{ sku: 'LT-ASUS-VIVO15-OLED', quantity: 1 }],
        },
        'idem-cached-key-01',
      );

      // Must return cached result directly from DB
      expect(result.orderNo).toBe('MWG-CACHED-999');
      // Must NOT start new transaction or reserve stock
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
      expect(reserveSpy).not.toHaveBeenCalled();
    });

    it('should execute restoreStockInTx in transaction when cancelling an order in PostgreSQL', async () => {
      const mockOrder = new Order();
      mockOrder.id = 'ord-cancel-uuid-1';
      mockOrder.order_no = 'MWG-CANCEL-001';
      mockOrder.store_id = '10000000-0000-0000-0000-000000000001';
      mockOrder.customer_id = '00000000-0000-0000-0000-000000000002';
      mockOrder.status = 'placed';
      mockOrder.total_vnd = new Decimal('19789000');

      const mockOrderItem = new OrderItem();
      mockOrderItem.id = 'item-cancel-uuid-1';
      mockOrderItem.order_id = mockOrder.id;
      mockOrderItem.variant_id = '50000000-0000-0000-0000-000000000001';
      mockOrderItem.sku_snapshot = 'LT-ASUS-VIVO15-OLED';
      mockOrderItem.title_snapshot = 'Laptop Asus Vivobook 15';
      mockOrderItem.unit_price_vnd = new Decimal('17990000');
      mockOrderItem.quantity = 1;
      mockOrderItem.line_total_vnd = new Decimal('17990000');

      const qbMock = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockOrder),
      };
      (mockQueryRunner.manager!.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);
      mockQueryRunner.manager!.find = jest.fn().mockResolvedValue([mockOrderItem]);

      const restoreStockSpy = jest
        .spyOn(inventoryService, 'restoreStockInTx')
        .mockResolvedValue(undefined);

      const cancelResult = await ordersService.cancelOrder('MWG-CANCEL-001', 'Khách đổi ý muốn mua máy khác');

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.status).toBe('CANCELLED');

      // Verify pessimistic lock on order
      expect(qbMock.setLock).toHaveBeenCalledWith('pessimistic_write');

      // Verify restoreStockInTx was called with queryRunner and order's items
      expect(restoreStockSpy).toHaveBeenCalledWith(
        mockQueryRunner,
        mockOrder.store_id,
        [{ variantId: mockOrderItem.variant_id, quantity: 1 }],
      );

      // Verify order status updated to cancelled
      expect(mockOrder.status).toBe('cancelled');
      expect(mockOrder.cancelled_at).toBeDefined();

      // Verify transaction committed
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});

