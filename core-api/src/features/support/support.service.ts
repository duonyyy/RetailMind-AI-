import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../orders/public-api';

export interface CreateTicketDTO {
  orderId?: string;
  title: string;
  description: string;
  priority?: string;
}

export interface TicketResultDTO {
  id: string;
  ticketCode: string;
  orderId: string;
  customerId: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class SupportService {
  private readonly memoryTickets: Map<string, TicketResultDTO> = new Map();

  constructor(
    @Optional()
    @InjectRepository(SupportTicket)
    private readonly ticketRepo?: Repository<SupportTicket>,
  ) {}

  async createTicket(customerId: string, dto: CreateTicketDTO): Promise<TicketResultDTO> {
    if (!dto.title || !dto.description) {
      throw new BadRequestException('Tiêu đề và nội dung khiếu nại không được để trống.');
    }

    const ticketCode = `TCK-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    if (this.ticketRepo) {
      const entity = this.ticketRepo.create({
        ticketCode,
        orderId: dto.orderId || 'N/A',
        customerId,
        title: dto.title,
        description: dto.description,
        status: 'OPEN',
      });
      const saved = await this.ticketRepo.save(entity);
      return {
        id: saved.id,
        ticketCode: saved.ticketCode,
        orderId: saved.orderId || 'N/A',
        customerId: saved.customerId,
        title: saved.title,
        description: saved.description,
        status: saved.status,
        createdAt: saved.createdAt ? saved.createdAt.toISOString() : now,
      };
    }

    const record: TicketResultDTO = {
      id: ticketCode,
      ticketCode,
      orderId: dto.orderId || 'N/A',
      customerId,
      title: dto.title,
      description: dto.description,
      status: 'OPEN',
      createdAt: now,
    };
    this.memoryTickets.set(ticketCode, record);
    return record;
  }

  async getCustomerTickets(customerId: string): Promise<TicketResultDTO[]> {
    if (this.ticketRepo) {
      const records = await this.ticketRepo.find({
        where: { customerId },
        order: { createdAt: 'DESC' },
      });
      return records.map((r) => ({
        id: r.id,
        ticketCode: r.ticketCode,
        orderId: r.orderId || 'N/A',
        customerId: r.customerId,
        title: r.title,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    return Array.from(this.memoryTickets.values()).filter(
      (t) => t.customerId === customerId,
    );
  }

  async getTicket(ticketId: string, customerId?: string): Promise<TicketResultDTO> {
    if (this.ticketRepo) {
      const record = await this.ticketRepo.findOne({ where: { id: ticketId } });
      if (!record || (customerId && record.customerId !== customerId)) {
        throw new NotFoundException(`Không tìm thấy phiếu hỗ trợ: ${ticketId}`);
      }
      return {
        id: record.id,
        ticketCode: record.ticketCode,
        orderId: record.orderId || 'N/A',
        customerId: record.customerId,
        title: record.title,
        description: record.description,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
      };
    }

    const item = this.memoryTickets.get(ticketId);
    if (!item || (customerId && item.customerId !== customerId)) {
      throw new NotFoundException(`Không tìm thấy phiếu hỗ trợ: ${ticketId}`);
    }
    return item;
  }
}

