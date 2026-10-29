import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { AuditEvent } from './entities/audit-event.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { ServiceUnavailableException } from '@nestjs/common';

describe('Audit Trail & Logging (SSOT Immobility & Traceability)', () => {
  let service: AuditService;
  let controller: AuditController;
  let auditStore: AuditEvent[];
  let mockAuditRepo: any;

  beforeEach(async () => {
    auditStore = [];
    mockAuditRepo = {
      create: jest.fn().mockImplementation((data) => ({
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...data,
        created_at: new Date(),
      })),
      save: jest.fn().mockImplementation(async (evt) => {
        auditStore.push(evt);
        return evt;
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => {
        let list = [...auditStore];
        const qb: any = {
          andWhere: jest.fn().mockImplementation((clause: string, params: any) => {
            if (params.action) list = list.filter((e) => e.action === params.action);
            if (params.entityType) list = list.filter((e) => e.entity_type === params.entityType);
            if (params.actorId) list = list.filter((e) => e.actor_id === params.actorId);
            return qb;
          }),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockImplementation((s: number) => {
            list = list.slice(s);
            return qb;
          }),
          take: jest.fn().mockImplementation((t: number) => {
            list = list.slice(0, t);
            return qb;
          }),
          getManyAndCount: jest.fn().mockImplementation(async () => {
            const total = list.length;
            return [list, total];
          }),
        };
        return qb;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditEvent),
          useValue: mockAuditRepo,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    controller = module.get<AuditController>(AuditController);
  });

  describe('AuditService (PostgreSQL SSOT Mode)', () => {
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
      expect(mockAuditRepo.save).toHaveBeenCalled();
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
      expect(adjustLogs.items[0].action).toBe('INVENTORY_ADJUST');

      // Filter by entityType
      const orderLogs = await service.getLogs({ entityType: 'Order' });
      expect(orderLogs.items.every((it) => it.entity_type === 'Order')).toBe(true);

      // Filter by actorId
      const custLogs = await service.getLogs({ actorId: 'cust:CUST01' });
      expect(custLogs.items.every((it) => it.actor_id === 'cust:CUST01')).toBe(true);
    });

    it('should fail-closed when audit repository is unavailable', async () => {
      const unconfiguredService = new AuditService(undefined);
      await expect(
        unconfiguredService.logEvent({ action: 'TEST', entityType: 'Test' }),
      ).rejects.toThrow(ServiceUnavailableException);

      await expect(unconfiguredService.getLogs()).rejects.toThrow(
        ServiceUnavailableException,
      );
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
      expect(response.items.length).toBeGreaterThanOrEqual(1);
      expect(response.total).toBeGreaterThanOrEqual(1);
    });
  });
});
