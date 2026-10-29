import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './services/inventory.service';
import { Inventory } from './entities/inventory.entity';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/public-api';

describe('Inventory Admin & Lifecycle (UC11, Pessimistic Adjust & Audit Trail)', () => {
  let controller: InventoryController;
  let service: InventoryService;
  let mockAuditService: any;
  let mockInventory: Inventory;
  let mockQueryRunner: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockAuditService = {
      logEvent: jest.fn().mockResolvedValue({ id: 'aud-test-1' }),
    };

    mockInventory = new Inventory();
    mockInventory.store_id = '10000000-0000-0000-0000-000000000001';
    mockInventory.variant_id = '50000000-0000-0000-0000-000000000001';
    mockInventory.on_hand_qty = 15;
    mockInventory.reserved_qty = 5;

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        query: jest.fn().mockImplementation(async (sql, params) => {
          if (sql.includes('FROM stores')) {
            return [{ id: '10000000-0000-0000-0000-000000000001', code: 'MWG_HCM_001', name: 'Store HCM' }];
          }
          if (sql.includes('FROM variants')) {
            return [{ id: '50000000-0000-0000-0000-000000000001', sku: 'LT-ASUS-VIVO15-OLED', name: 'Asus Vivobook', price_vnd: '17990000' }];
          }
          return [];
        }),
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockImplementation(() => Promise.resolve(mockInventory)),
        }),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      },
    };

    mockDataSource = {
      isInitialized: true,
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      manager: mockQueryRunner.manager,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        InventoryService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
    service = module.get<InventoryService>(InventoryService);
  });

  describe('InventoryController Roles & Metadata', () => {
    it('should protect adjust and reserve endpoints with ADMIN role', () => {
      const reflector = new Reflector();
      const adjustRoles = reflector.get<string[]>('roles', controller.adjustInventory);
      const reserveRoles = reflector.get<string[]>('roles', controller.reserveStock);

      expect(adjustRoles).toEqual(['ADMIN']);
      expect(reserveRoles).toEqual(['ADMIN']);
    });
  });

  describe('InventoryService.adjustInventory', () => {
    it('should successfully adjust inventory with pessimistic lock and record audit event', async () => {
      const result = await service.adjustInventory(
        '10000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000001',
        30,
        'Nhập thêm 15 máy từ kho tổng',
        'admin:ADM01',
      );

      expect(result.onHandQty).toBe(30);
      expect(result.reservedQty).toBe(5);
      expect(result.availableQty).toBe(25);
      expect(mockInventory.on_hand_qty).toBe(30);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ADJUST',
          actorId: 'admin:ADM01',
          entityType: 'Inventory',
          payload: expect.objectContaining({
            beforeOnHand: 15,
            newOnHand: 30,
            reservedQty: 5,
            reason: 'Nhập thêm 15 máy từ kho tổng',
          }),
        }),
        mockQueryRunner.manager,
      );
    });

    it('should reject adjustment when newOnHand is less than reservedQty (Anti-Negative Available)', async () => {
      // current reserved is 5. Attempting to set onHand to 3 (< 5) must be rejected
      await expect(
        service.adjustInventory(
          '10000000-0000-0000-0000-000000000001',
          '50000000-0000-0000-0000-000000000001',
          3,
          'Giảm tồn kho sai quy trình',
          'admin:ADM01',
        ),
      ).rejects.toThrow(ConflictException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should validate inputs for negative quantity or blank reason', async () => {
      await expect(
        service.adjustInventory(
          'store-1',
          'var-1',
          -5,
          'Lý do hợp lệ',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.adjustInventory(
          'store-1',
          'var-1',
          20,
          '   ',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('InventoryService.commitStockInTx (Payment Completion Lifecycle)', () => {
    it('should decrement both on_hand and reserved stock upon simulated payment completion', async () => {
      mockInventory.on_hand_qty = 10;
      mockInventory.reserved_qty = 2;

      await service.commitStockInTx(mockQueryRunner, '10000000-0000-0000-0000-000000000001', [
        { variantId: '50000000-0000-0000-0000-000000000001', quantity: 2 },
      ]);

      expect(mockInventory.reserved_qty).toBe(0);
      expect(mockInventory.on_hand_qty).toBe(8);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockInventory);
    });
  });
});
