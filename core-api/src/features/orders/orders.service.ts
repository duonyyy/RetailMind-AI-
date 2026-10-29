import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { PreviewTokenHelper } from './helpers/preview-token.helper';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { randomUUID } from 'crypto';

export interface OrderItemInput {
  sku: string;
  quantity: number;
}

export interface PreviewCalculationDTO {
  items: {
    sku: string;
    name: string;
    unitPriceVnd: string;
    quantity: number;
    lineTotalVnd: string;
  }[];
  subtotalVnd: string;
  discountVnd: string;
  vatVnd: string;
  totalVnd: string;
  formattedTotal: string;
  appliedDiscountNote?: string;
  previewToken?: string;
  expiresAt?: string;
}

export interface CheckoutInputDTO {
  storeId: string;
  customerId?: string;
  items: OrderItemInput[];
  discountCode?: string;
  paymentMethod?: string;
  previewToken?: string;
}

export interface OrderResultDTO {
  orderId: string;
  orderNo: string;
  status: string;
  storeId: string;
  customerId: string;
  totalVnd: string;
  formattedTotal: string;
  itemsCount: number;
  confirmedAt: string;
  idempotencyKey: string;
  items?: {
    sku: string;
    name?: string;
    unitPriceVnd?: string;
    quantity: number;
    lineTotalVnd?: string;
  }[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly inventoryService: InventoryService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  private db(): DataSource {
    if (!this.dataSource?.isInitialized) throw new ServiceUnavailableException('Không thể xác nhận dữ liệu giao dịch lúc này.');
    return this.dataSource;
  }

  async calculatePreview(items: OrderItemInput[], discountCode?: string, storeId?: string, customerId?: string, manager?: EntityManager): Promise<PreviewCalculationDTO> {
    const dbManager = manager || this.db().manager;
    const store = await this.inventoryService.resolveStore(dbManager, storeId || '');
    if (!customerId) throw new BadRequestException('Cần xác thực khách hàng.');
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('Giỏ hàng không được rỗng.');
    let subtotal = new Decimal(0);
    const calculatedItems: PreviewCalculationDTO['items'] = [];
    for (const item of items) {
      if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new BadRequestException('Số lượng phải là số nguyên dương.');
      const product = await this.inventoryService.resolveVariant(dbManager, item.sku);
      const unitPrice = new Decimal(product.price_vnd);
      const total = unitPrice.times(item.quantity);
      subtotal = subtotal.plus(total);
      calculatedItems.push({ sku: product.sku, name: product.name, unitPriceVnd: unitPrice.toString(), quantity: item.quantity, lineTotalVnd: total.toString() });
    }
    let discount = new Decimal(0);
    let discountNote = 'Không áp dụng';
    if (discountCode) {
      const code = discountCode.trim().toUpperCase();
      if (code === 'MWG_VIP500' || code === 'BACK2SCHOOL') { discount = new Decimal(500000); discountNote = 'Mã ưu đãi (-500.000 ₫)'; }
      else if (code === 'RETAILMIND10') { discount = subtotal.times(0.10).floor(); discountNote = 'Mã ưu đãi (-10%)'; }
    }
    const discounted = Decimal.max(0, subtotal.minus(discount));
    const vat = discounted.times(0.10).floor();
    const total = discounted.plus(vat);
    const { token, expiresAt } = PreviewTokenHelper.sign({ customerId, storeId: store.id, items: calculatedItems.map(it => ({sku: it.sku, quantity: it.quantity})), subtotalVnd: subtotal.toString(), discountVnd: discount.toString(), vatVnd: vat.toString(), totalVnd: total.toString() });
    return { items: calculatedItems, subtotalVnd: subtotal.toString(), discountVnd: discount.toString(), vatVnd: vat.toString(), totalVnd: total.toString(), formattedTotal: `${new Intl.NumberFormat('vi-VN').format(BigInt(total.toFixed(0)))} ₫`, appliedDiscountNote: discountNote, previewToken: token, expiresAt };
  }

  async checkout(dto: CheckoutInputDTO, idempotencyKey: string): Promise<OrderResultDTO> {
    const db = this.db();
    if (!idempotencyKey || !dto?.customerId) throw new BadRequestException('Cần xác thực khách hàng và Idempotency-Key.');
    const scopedKey = `${dto.customerId}:${idempotencyKey}`;
    const existing = await db.getRepository(IdempotencyKey).findOne({ where: { key: scopedKey } });
    if (existing?.responsePayload) return existing.responsePayload as OrderResultDTO;
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      try {
        const store = await this.inventoryService.resolveStore(runner.manager, dto.storeId);
        const preview = await this.calculatePreview(dto.items, dto.discountCode, store.id, dto.customerId, runner.manager);
        if (dto.previewToken) {
          const verified = PreviewTokenHelper.verify(dto.previewToken);
          const previewItems = preview.items.map(it => ({ sku: it.sku, quantity: it.quantity }));
          if (verified.storeId !== store.id || verified.customerId !== dto.customerId || JSON.stringify(verified.items) !== JSON.stringify(previewItems) || verified.totalVnd !== preview.totalVnd) {
            throw new ConflictException('Bản xem trước không còn khớp. Vui lòng xác nhận lại.');
          }
        }
        await this.inventoryService.reserveMultipleWithLock(runner, store.id, preview.items.map(it => ({ variantId: it.sku, quantity: it.quantity })));
        const orderNo = `MWG-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${randomUUID().slice(0,8).toUpperCase()}`;
        const idem = await runner.manager.save(runner.manager.create(IdempotencyKey, { key: scopedKey, status: 'completed' }));
        const order = await runner.manager.save(runner.manager.create(Order, { order_no: orderNo, customer_id: dto.customerId, store_id: store.id, idempotency_key_id: idem.id, status: 'placed', total_vnd: new Decimal(preview.totalVnd) }));
        for (const item of preview.items) {
          const variant = await this.inventoryService.resolveVariant(runner.manager, item.sku);
          await runner.manager.save(runner.manager.create(OrderItem, { order_id: order.id, variant_id: variant.id, sku_snapshot: item.sku, title_snapshot: item.name, unit_price_vnd: new Decimal(item.unitPriceVnd), quantity: item.quantity, line_total_vnd: new Decimal(item.lineTotalVnd) }));
        }
        const result: OrderResultDTO = { orderId: order.id, orderNo, status: 'placed', storeId: store.id, customerId: dto.customerId, totalVnd: preview.totalVnd, formattedTotal: preview.formattedTotal, itemsCount: preview.items.length, confirmedAt: order.confirmed_at.toISOString(), idempotencyKey, items: preview.items };
        idem.targetId = order.id;
        idem.responsePayload = result;
        await runner.manager.save(idem);
        await runner.commitTransaction();
        return result;
      } catch (error) { await runner.rollbackTransaction(); throw error; }
    } finally { await runner.release(); }
  }

  async getOrder(orderIdOrNo: string, principal?: { id: string; role: string }): Promise<OrderResultDTO> {
    if (!principal) throw new NotFoundException('Không tìm thấy đơn hàng.');
    const db = this.db();
    const rows = await db.manager.query('SELECT * FROM orders WHERE (id::text = $1 OR order_no = $1) AND ($2 = true OR customer_id::text = $3)', [orderIdOrNo, principal.role === 'ADMIN', principal.id]);
    if (!rows.length) throw new NotFoundException('Không tìm thấy đơn hàng.');
    const order = rows[0];
    const items = await db.getRepository(OrderItem).find({ where: { order_id: order.id } });
    return { orderId: order.id, orderNo: order.order_no, status: order.status, storeId: order.store_id, customerId: order.customer_id, totalVnd: String(order.total_vnd), formattedTotal: `${new Intl.NumberFormat('vi-VN').format(BigInt(order.total_vnd))} ₫`, itemsCount: items.length, confirmedAt: new Date(order.confirmed_at).toISOString(), idempotencyKey: '', items: items.map(it => ({sku: it.sku_snapshot, name: it.title_snapshot, unitPriceVnd: it.unit_price_vnd.toString(), quantity: it.quantity, lineTotalVnd: it.line_total_vnd.toString()})) };
  }

  async cancelOrder(orderIdOrNo: string, reason = 'Khách hàng yêu cầu hủy đơn'): Promise<{ success: boolean; orderId: string; orderNo: string; status: string; message: string }> {
    const runner = this.db().createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      try {
        const order = await runner.manager.createQueryBuilder(Order, 'ord').setLock('pessimistic_write').where('ord.id::text = :id OR ord.order_no = :id', {id: orderIdOrNo}).getOne();
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
        if (order.status === 'cancelled') throw new ConflictException('Đơn hàng đã bị hủy.');
        const items = await runner.manager.find(OrderItem, { where: { order_id: order.id } });
        if (!items.length) throw new ConflictException('Không thể xác nhận các sản phẩm cần hoàn kho.');
        await this.inventoryService.restoreStockInTx(runner, order.store_id, items.map(it => ({variantId: it.variant_id, quantity: it.quantity})));
        order.status = 'cancelled'; order.cancelled_at = new Date();
        await runner.manager.save(order);
        await runner.commitTransaction();
        return { success: true, orderId: order.id, orderNo: order.order_no, status: 'CANCELLED', message: `Đơn hàng ${order.order_no} đã được hủy. Lý do: ${reason}.` };
      } catch (error) { await runner.rollbackTransaction(); throw error; }
    } finally { await runner.release(); }
  }
}
