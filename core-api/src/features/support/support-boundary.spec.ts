import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SupportService } from './support.service';

describe('Support ticket trusted boundary', () => {
  const input = { orderId: 'ORDER-A', title: 'Máy lỗi', description: 'Cần hỗ trợ', confirmedProfilePhone: '0912345678' };
  const saved: any[] = [];
  const repo = {
    create: (value: any) => value,
    save: async (value: any) => { const result = { ...value, id: 'ticket-id', createdAt: new Date('2026-01-01T00:00:00Z') }; saved.push(result); return result; },
  };
  const manager = {
    query: jest.fn(async (sql: string, params: string[]) => {
      if (sql.includes('FROM users')) return params[0] === 'alice' || params[0] === 'bob' ? [{ phone_number: '0912345678' }] : [];
      if (sql.includes('FROM orders')) return params[0] === 'alice' && params[1] === 'ORDER-A' ? [{ id: 'order-a-id' }] : [];
      return [];
    }),
    getRepository: () => repo,
  };
  const db = { isInitialized: true, transaction: async (isolation: string, callback: any) => {
    expect(isolation).toBe('SERIALIZABLE');
    return callback(manager);
  } };
  const service = new SupportService(repo as any, db as any);

  beforeEach(() => { saved.length = 0; manager.query.mockClear(); });

  it('creates only for the authenticated owner and uses no phone in the ticket', async () => {
    const result = await service.createTicket('alice', input);
    expect(result.orderId).toBe('order-a-id');
    expect(result.customerId).toBe('alice');
    expect(result.ticketCode).toMatch(/^TCK-/);
    expect(JSON.stringify(saved)).not.toContain('0912345678');
    await expect(service.createTicket('bob', input)).rejects.toThrow(NotFoundException);
    expect(saved).toHaveLength(1);
  });

  it('requires confirmation of the current profile phone', async () => {
    await expect(service.createTicket('alice', { ...input, confirmedProfilePhone: '0999995678' })).rejects.toThrow(BadRequestException);
    await expect(service.createTicket('alice', { ...input, confirmedProfilePhone: undefined })).rejects.toThrow(BadRequestException);
    expect(saved).toHaveLength(0);
  });

  it('fails closed without a database or when the database rejects', async () => {
    await expect(new SupportService().createTicket('alice', input)).rejects.toThrow(ServiceUnavailableException);
    const broken = new SupportService(repo as any, { isInitialized: true, transaction: async () => { throw new Error('private database detail'); } } as any);
    await expect(broken.createTicket('alice', input)).rejects.toThrow(ServiceUnavailableException);
  });
});
