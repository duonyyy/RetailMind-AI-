import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { SupportTicket } from '../orders/public-api';

export interface CreateTicketDTO {
  orderId?: string;
  title: string;
  description: string;
  priority?: string;
  confirmedProfilePhone?: string;
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
  constructor(
    @Optional()
    @InjectRepository(SupportTicket)
    private readonly ticketRepo?: Repository<SupportTicket>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  async createTicket(customerId: string, dto: CreateTicketDTO): Promise<TicketResultDTO> {
    if (!dto || typeof dto.title !== 'string' || typeof dto.description !== 'string' || !dto.title.trim() || !dto.description.trim() || dto.title.length > 255 || dto.description.length > 2000) {
      throw new BadRequestException('Tiêu đề và nội dung khiếu nại không được để trống.');
    }
    if (typeof dto.orderId !== 'string' || !dto.orderId.trim() || dto.orderId.length > 100 || typeof dto.confirmedProfilePhone !== 'string' || dto.confirmedProfilePhone.length > 50) {
      throw new BadRequestException('Cần chọn đơn hàng và xác nhận số điện thoại trong hồ sơ.');
    }
    if (!this.dataSource?.isInitialized || !this.ticketRepo) {
      throw new ServiceUnavailableException('Không thể xác nhận dữ liệu hỗ trợ lúc này.');
    }
    try {
      return await this.dataSource.transaction(async (manager) => {
      const users = await manager.query('SELECT phone_number FROM users WHERE id = $1 AND is_active = true FOR SHARE', [customerId]);
      const phone = typeof users[0]?.phone_number === 'string' ? users[0].phone_number.replace(/\D/g, '') : '';
      if (phone.length < 9 || phone !== dto.confirmedProfilePhone!.replace(/\D/g, '')) {
        throw new BadRequestException('Số điện thoại hồ sơ không khả dụng hoặc đã thay đổi. Vui lòng kiểm tra và xác nhận lại.');
      }
      const orders = await manager.query('SELECT id FROM orders WHERE customer_id = $1 AND (id::text = $2 OR order_no = $2) FOR SHARE', [customerId, dto.orderId.trim()]);
      if (!orders.length) throw new NotFoundException('Không tìm thấy đơn hàng.');
      const repo = manager.getRepository(SupportTicket);
      const saved = await repo.save(repo.create({
        ticketCode: `TCK-${randomUUID()}`, orderId: String(orders[0].id), customerId,
        title: dto.title.trim(), description: dto.description.trim(), status: 'OPEN',
      }));
      return { id: saved.id, ticketCode: saved.ticketCode, orderId: saved.orderId,
        customerId: saved.customerId, title: saved.title, description: saved.description,
        status: saved.status, createdAt: saved.createdAt.toISOString() };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Không thể tạo phiếu hỗ trợ lúc này.');
    }
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

    throw new ServiceUnavailableException('Không thể xác nhận danh sách phiếu hỗ trợ lúc này.');
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

    throw new ServiceUnavailableException('Không thể xác nhận phiếu hỗ trợ lúc này.');
  }
}

