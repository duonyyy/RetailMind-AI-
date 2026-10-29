import { Injectable, Optional, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditEvent } from './entities/audit-event.entity';

export interface AuditLogInput {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditFilterDTO {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
}

export interface PaginatedAuditLogs {
  items: AuditEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
   * Hỗ trợ EntityManager trong cùng Transaction nếu được truyền vào.
   */
  async logEvent(input: AuditLogInput, manager?: EntityManager): Promise<AuditEvent> {
    this.logger.log(`[Audit] Action: ${input.action} on ${input.entityType} (Actor: ${input.actorId || 'system'})`);

    if (manager) {
      const event = manager.create(AuditEvent, {
        actor_id: input.actorId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        payload: input.payload,
        ip_address: input.ipAddress,
      });
      return manager.save(event);
    }

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
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
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

  async getLogs(filter: AuditFilterDTO = {}): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    if (this.auditRepo) {
      const qb = this.auditRepo.createQueryBuilder('aud');

      if (filter.action) {
        qb.andWhere('aud.action = :action', { action: filter.action });
      }
      if (filter.entityType) {
        qb.andWhere('aud.entity_type = :entityType', { entityType: filter.entityType });
      }
      if (filter.actorId) {
        qb.andWhere('aud.actor_id = :actorId', { actorId: filter.actorId });
      }
      if (filter.from) {
        qb.andWhere('aud.created_at >= :from', { from: new Date(filter.from) });
      }
      if (filter.to) {
        qb.andWhere('aud.created_at <= :to', { to: new Date(filter.to) });
      }

      qb.orderBy('aud.created_at', 'DESC');
      qb.skip(skip).take(limit);

      const [items, total] = await qb.getManyAndCount();
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }

    let filtered = [...this.memoryAuditLogs];
    if (filter.action) {
      filtered = filtered.filter((l) => l.action === filter.action);
    }
    if (filter.entityType) {
      filtered = filtered.filter((l) => l.entity_type === filter.entityType);
    }
    if (filter.actorId) {
      filtered = filtered.filter((l) => l.actor_id === filter.actorId);
    }
    if (filter.from) {
      const fromTime = new Date(filter.from).getTime();
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() >= fromTime);
    }
    if (filter.to) {
      const toTime = new Date(filter.to).getTime();
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() <= toTime);
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getRecentLogs(limit = 50): Promise<AuditEvent[]> {
    const res = await this.getLogs({ limit });
    return res.items;
  }
}
