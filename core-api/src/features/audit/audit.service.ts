import { Injectable, Optional, Logger, ServiceUnavailableException } from '@nestjs/common';
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

  constructor(
    @Optional()
    @InjectRepository(AuditEvent)
    private readonly auditRepo?: Repository<AuditEvent>,
  ) {}

  private getRepo(): Repository<AuditEvent> {
    if (!this.auditRepo) {
      throw new ServiceUnavailableException('Dịch vụ nhật ký kiểm toán bất biến chưa sẵn sàng.');
    }
    return this.auditRepo;
  }

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

    const repo = this.getRepo();
    const event = repo.create({
      actor_id: input.actorId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload: input.payload,
      ip_address: input.ipAddress,
    });
    return repo.save(event);
  }

  async getLogs(filter: AuditFilterDTO = {}): Promise<PaginatedAuditLogs> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.getRepo().createQueryBuilder('aud');

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

  async getRecentLogs(limit = 50): Promise<AuditEvent[]> {
    const res = await this.getLogs({ limit });
    return res.items;
  }
}
