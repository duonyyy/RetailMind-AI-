import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEvent } from './entities/audit-event.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';

describe('Audit Trail & Logging (SSOT Immobility & Traceability)', () => {
  let service: AuditService;
  let controller: AuditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: undefined, // fallback to clean in-memory mode
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    controller = module.get<AuditController>(AuditController);
  });

  describe('AuditService (In-Memory Fallback)', () => {
    it('should start with zero fake seed data (Single Source of Truth discipline)', async () => {
      const logs = await service.getLogs();
      expect(logs.total).toBe(0);
      expect(logs.items).toEqual([]);
    });

    it('should record immutable audit events with append-only behavior', async () => {
      const event1 = await service.logEvent({
        actorId: 'admin:ADM01',
        action: 'INVENTORY_ADJUST',
        entityType: 'Inventory',
        entityId: 'store-1:var-1',
        payload: { beforeOnHand: 10, newOnHand: 25, reason: 'Kiểm kho định kỳ' },
        ipAddress: '127.0.0.1',
      });

      expect(event1.id).toBeDefined();
      expect(event1.action).toBe('INVENTORY_ADJUST');
      expect(event1.entity_type).toBe('Inventory');
      expect(event1.actor_id).toBe('admin:ADM01');

      const logs = await service.getLogs();
      expect(logs.total).toBe(1);
      expect(logs.items[0].id).toBe(event1.id);
    });

    it('should filter audit logs by action, entityType, and actorId', async () => {
      await service.logEvent({
        actorId: 'admin:ADM01',
        action: 'INVENTORY_ADJUST',
        entityType: 'Inventory',
        entityId: 'item-1',
      });
      await service.logEvent({
        actorId: 'cust:CUST01',
        action: 'ORDER_PLACED',
        entityType: 'Order',
        entityId: 'ord-1',
      });
      await service.logEvent({
        actorId: 'cust:CUST01',
        action: 'ORDER_PAYMENT',
        entityType: 'Order',
        entityId: 'ord-1',
      });

      // Filter by action
      const adjustLogs = await service.getLogs({ action: 'INVENTORY_ADJUST' });
      expect(adjustLogs.total).toBe(1);
      expect(adjustLogs.items[0].action).toBe('INVENTORY_ADJUST');

      // Filter by entityType
      const orderLogs = await service.getLogs({ entityType: 'Order' });
      expect(orderLogs.total).toBe(2);

      // Filter by actorId
      const custLogs = await service.getLogs({ actorId: 'cust:CUST01' });
      expect(custLogs.total).toBe(2);

      // Non-existent filter
      const none = await service.getLogs({ action: 'UNKNOWN_ACTION' });
      expect(none.total).toBe(0);
      expect(none.items).toEqual([]);
    });

    it('should paginate audit logs accurately', async () => {
      for (let i = 1; i <= 25; i++) {
        await service.logEvent({
          actorId: `user-${i}`,
          action: 'TEST_EVENT',
          entityType: 'Test',
          payload: { index: i },
        });
      }

      const page1 = await service.getLogs({ page: 1, limit: 10 });
      expect(page1.total).toBe(25);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(10);
      expect(page1.totalPages).toBe(3);
      expect(page1.items.length).toBe(10);

      const page3 = await service.getLogs({ page: 3, limit: 10 });
      expect(page3.items.length).toBe(5);
    });

    it('should support logging with transactional EntityManager', async () => {
      const mockManager: any = {
        create: jest.fn().mockImplementation((entityClass, data) => ({
          id: 'aud-tx-123',
          ...data,
          created_at: new Date(),
        })),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      };

      const result = await service.logEvent(
        {
          actorId: 'admin:ADM02',
          action: 'ORDER_CANCEL',
          entityType: 'Order',
          entityId: 'order-999',
        },
        mockManager,
      );

      expect(mockManager.create).toHaveBeenCalledWith(
        AuditEvent,
        expect.objectContaining({
          action: 'ORDER_CANCEL',
          entity_type: 'Order',
          entity_id: 'order-999',
        }),
      );
      expect(mockManager.save).toHaveBeenCalled();
      expect(result.id).toBe('aud-tx-123');
    });
  });

  describe('AuditController (RBAC & Endpoint Protection)', () => {
    it('should enforce ADMIN role guard via decorator metadata', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>('roles', AuditController);
      expect(roles).toEqual(['ADMIN']);
    });

    it('should return paginated audit logs envelope', async () => {
      await service.logEvent({
        actorId: 'admin:ROOT',
        action: 'INVENTORY_ADJUST',
        entityType: 'Inventory',
      });

      const response = await controller.getLogs('1', '10', 'INVENTORY_ADJUST');
      expect(response.status).toBe('success');
      expect(response.total).toBe(1);
      expect(response.items.length).toBe(1);
      expect(response.items[0].action).toBe('INVENTORY_ADJUST');
    });
  });
});
