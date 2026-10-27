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
  private readonly memoryAuditLogs: AuditEvent[] = [];

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
      return this.auditRepo.find({
        order: { created_at: 'DESC' },
        take: limit,
      });
    }

    return [...this.memoryAuditLogs]
      .reverse()
      .slice(0, limit);
  }
}

