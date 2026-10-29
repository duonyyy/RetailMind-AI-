import { Injectable, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export interface AuditLogInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly memoryAuditLogs: AuditEvent[] = [
    {
      id: 'aud-seed-001',
      actor_id: 'admin:ADM01 (Nguyễn Quản Trị)',
      action: 'APPROVE_HITL_REFUND',
      entity_type: 'HITL_Task',
      entity_id: 'task-hitl-8821',
      payload: { amount_vnd: 500000, reason: 'Giao trễ quá 2.5 giờ' },
      ip_address: '127.0.0.1',
      created_at: new Date('2026-10-27T10:45:12Z'),
    },
    {
      id: 'aud-seed-002',
      actor_id: 'system:AgentHarness',
      action: 'STOCK_RESERVE_PESSIMISTIC',
      entity_type: 'Inventory',
      entity_id: 'SKU: LT-ASUS-VIVO15-OLED',
      payload: { quantity: 1, lock_mode: 'pessimistic_write' },
      ip_address: '127.0.0.1',
      created_at: new Date('2026-10-27T10:30:05Z'),
    },
    {
      id: 'aud-seed-003',
      actor_id: 'customer:CUST-883',
      action: 'CHECKOUT_ORDER_IDEMPOTENT',
      entity_type: 'Order',
      entity_id: 'MWG-20261026-9812',
      payload: { idempotency_key: 'idem-20261026-9812', total_vnd: 17990000 },
      ip_address: '127.0.0.1',
      created_at: new Date('2026-10-27T10:10:44Z'),
    },
  ];

  constructor(
    @Optional()
    @InjectRepository(AuditEvent)
    private readonly auditRepo?: Repository<AuditEvent>,
  ) {}

  /**
   * Ghi nhận sự kiện kiểm toán bất biến (Append-Only)
   * Tuyệt đối không có hàm update hoặc delete!
   */
  async logEvent(input: AuditLogInput): Promise<AuditEvent> {
    this.logger.log(`[Audit] Action: ${input.action} on ${input.entityType} (Actor: ${input.actorId || 'system'})`);

    if (this.auditRepo) {
      const event = this.auditRepo.create({
        actor_id: input.actorId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        payload: input.payload,
        ip_address: input.ipAddress,
      });
      return this.auditRepo.save(event);
    }

    const event: AuditEvent = {
      id: `aud-${Date.now()}`,
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload: input.payload,
      ip_address: input.ipAddress,
      created_at: new Date(),
    };
    this.memoryAuditLogs.push(event);
    return event;
  }

  async getRecentLogs(limit = 50): Promise<AuditEvent[]> {
    if (this.auditRepo) {
      const logs = await this.auditRepo.find({
        order: { created_at: 'DESC' },
        take: limit,
      });
      if (logs && logs.length > 0) {
        return logs;
      }
    }

    return [...this.memoryAuditLogs]
      .reverse()
      .slice(0, limit);
  }
}

