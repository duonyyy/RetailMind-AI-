import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import Decimal from 'decimal.js';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { CartService } from '../cart/public-api';
import { PreviewTokenHelper } from './helpers/preview-token.helper';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { randomUUID, createHash } from 'crypto';

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
    @Optional() private readonly cartService?: CartService,
  ) {}

  private db(): DataSource {
    if (!this.dataSource?.isInitialized) throw new ServiceUnavailableException('Không thể xác nhận dữ liệu giao dịch lúc này.');
    return this.dataSource;
  }

  async calculatePreview(
    items: OrderItemInput[],
    discountCode?: string,
    storeId?: string,
    customerId?: string,
    manager?: EntityManager,
  ): Promise<PreviewCalculationDTO> {
    const dbManager = manager || this.db().manager;
    const store = await this.inventoryService.resolveStore(dbManager, storeId || '10000000-0000-0000-0000-000000000001');
    const validCustomerId = customerId || '00000000-0000-0000-0000-000000000002';
    if (!Array.isArray(items) || !items.length) throw new BadRequestException('Giỏ hàng không được rỗng.');
    let subtotal = new Decimal(0);
    const calculatedItems: PreviewCalculationDTO['items'] = [];
    for (const item of items) {
      if (!item || !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('Số lượng phải là số nguyên dương.');
      }
      const product = await this.inventoryService.resolveVariant(dbManager, item.sku);
      const unitPrice = new Decimal(product.price_vnd);
      const total = unitPrice.times(item.quantity);
      subtotal = subtotal.plus(total);
      calculatedItems.push({
        sku: product.sku,
        name: product.name,
        unitPriceVnd: unitPrice.toString(),
        quantity: item.quantity,
        lineTotalVnd: total.toString(),
      });
    }
    let discount = new Decimal(0);
    let discountNote = 'Không áp dụng';
    if (discountCode) {
      const code = discountCode.trim().toUpperCase();
      if (code === 'MWG_VIP500' || code === 'BACK2SCHOOL') {
        discount = new Decimal(500000);
        discountNote = 'Mã ưu đãi (-500.000 ₫)';
      } else if (code === 'RETAILMIND10') {
        discount = subtotal.times(0.10).floor();
        discountNote = 'Mã ưu đãi (-10%)';
      }
    }
    const discounted = Decimal.max(0, subtotal.minus(discount));
    const vat = discounted.times(0.10).floor();
    const total = discounted.plus(vat);
    const { token, expiresAt } = PreviewTokenHelper.sign({
      customerId: validCustomerId,
      storeId: store.id,
      items: calculatedItems.map((it) => ({ sku: it.sku, quantity: it.quantity })),
      subtotalVnd: subtotal.toString(),
      discountVnd: discount.toString(),
      vatVnd: vat.toString(),
      totalVnd: total.toString(),
    });
    return {
      items: calculatedItems,
      subtotalVnd: subtotal.toString(),
      discountVnd: discount.toString(),
      vatVnd: vat.toString(),
      totalVnd: total.toString(),
      formattedTotal: `${new Intl.NumberFormat('vi-VN').format(BigInt(total.toFixed(0)))} ₫`,
      appliedDiscountNote: discountNote,
      previewToken: token,
      expiresAt,
    };
  }

  async checkout(dto: CheckoutInputDTO, idempotencyKey: string): Promise<OrderResultDTO> {
    const db = this.db();
    if (!idempotencyKey) throw new BadRequestException('Cần cung cấp Idempotency-Key.');
    const customerId = dto?.customerId || '00000000-0000-0000-0000-000000000002';
    const scopedKey = `${customerId}:${idempotencyKey}`;

    // 1. Calculate tamper-detection request hash
    const normalizedItems = (dto.items || [])
      .map((it) => ({ sku: it.sku, quantity: it.quantity }))
      .sort((a, b) => a.sku.localeCompare(b.sku));
    const requestHashPayload = JSON.stringify({
      storeId: dto.storeId,
      customerId,
      items: normalizedItems,
      discountCode: (dto.discountCode || '').trim().toUpperCase(),
    });
    const requestHash = createHash('sha256').update(requestHashPayload).digest('hex');

    // 2. Check existing Idempotency Key (Tamper Detection & Replay Protection)
    const existing = await db.getRepository(IdempotencyKey).findOne({ where: { key: scopedKey } });
    if (existing?.responsePayload) {
      if (existing.responsePayload._requestHash && existing.responsePayload._requestHash !== requestHash) {
        throw new ConflictException('Idempotency payload mismatch: Yêu cầu không khớp với khóa idempotent đã dùng.');
      }
      return existing.responsePayload as OrderResultDTO;
    }

    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      try {
        const store = await this.inventoryService.resolveStore(runner.manager, dto.storeId);
        const preview = await this.calculatePreview(dto.items, dto.discountCode, store.id, customerId, runner.manager);
        if (dto.previewToken) {
          const verified = PreviewTokenHelper.verify(dto.previewToken);
          const previewItems = preview.items.map((it) => ({ sku: it.sku, quantity: it.quantity }));
          if (
            verified.storeId !== store.id ||
            verified.customerId !== customerId ||
            JSON.stringify(verified.items) !== JSON.stringify(previewItems) ||
            verified.totalVnd !== preview.totalVnd
          ) {
            throw new ConflictException('Bản xem trước không còn khớp. Vui lòng xác nhận lại.');
          }
        }
        await this.inventoryService.reserveMultipleWithLock(
          runner,
          store.id,
          preview.items.map((it) => ({ variantId: it.sku, quantity: it.quantity })),
        );
        const orderNo = `MWG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const idem = await runner.manager.save(
          runner.manager.create(IdempotencyKey, { key: scopedKey, status: 'completed' }),
        );
        const order = await runner.manager.save(
          runner.manager.create(Order, {
            order_no: orderNo,
            customer_id: customerId,
            store_id: store.id,
            idempotency_key_id: idem.id,
            status: 'placed',
            total_vnd: new Decimal(preview.totalVnd),
            confirmed_at: new Date(),
          }),
        );
        for (const item of preview.items) {
          const variant = await this.inventoryService.resolveVariant(runner.manager, item.sku);
          await runner.manager.save(
            runner.manager.create(OrderItem, {
              order_id: order.id,
              variant_id: variant.id,
              sku_snapshot: item.sku,
              title_snapshot: item.name,
              unit_price_vnd: new Decimal(item.unitPriceVnd),
              quantity: item.quantity,
              line_total_vnd: new Decimal(item.lineTotalVnd),
            }),
          );
        }
        const result: OrderResultDTO = {
          orderId: order.id,
          orderNo,
          status: 'placed',
          storeId: store.id,
          customerId,
          totalVnd: preview.totalVnd,
          formattedTotal: preview.formattedTotal,
          itemsCount: preview.items.length,
          confirmedAt: (order.confirmed_at || new Date()).toISOString(),
          idempotencyKey,
          items: preview.items,
        };
        idem.targetId = order.id;
        idem.responsePayload = { ...result, _requestHash: requestHash };
        await runner.manager.save(idem);
        await runner.commitTransaction();

        // 3. Auto-clear active cart for customer
        if (this.cartService) {
          try {
            await this.cartService.clearCart(customerId);
          } catch {
            // Cart was already cleared or empty
          }
        }

        return result;
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
  }

  async getOrders(
    principal: { id: string; role: string } = { id: 'system', role: 'ADMIN' },
    options: { page?: number; limit?: number; status?: string } = {},
  ): Promise<{
    orders: OrderResultDTO[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const offset = (page - 1) * limit;

    const db = this.db();
    const isAdmin = principal?.role === 'ADMIN';
    const customerId = principal?.id;

    let countSql = `SELECT COUNT(*) as count FROM orders WHERE ($1 = true OR customer_id::text = $2)`;
    let selectSql = `SELECT * FROM orders WHERE ($1 = true OR customer_id::text = $2)`;
    const params: any[] = [isAdmin, customerId];

    if (options.status) {
      params.push(options.status);
      countSql += ` AND status = $${params.length}`;
      selectSql += ` AND status = $${params.length}`;
    }

    selectSql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const countRes = await db.manager.query(countSql, params.slice(0, options.status ? 3 : 2));
    const total = parseInt(countRes[0]?.count || '0', 10);

    const rows = await db.manager.query(selectSql, params);
    const orderResults: OrderResultDTO[] = [];

    for (const order of rows) {
      const items = await db.getRepository(OrderItem).find({ where: { order_id: order.id } });
      const totalNum = BigInt(order.total_vnd ? String(order.total_vnd) : '0');
      orderResults.push({
        orderId: order.id,
        orderNo: order.order_no,
        status: order.status,
        storeId: order.store_id,
        customerId: order.customer_id,
        totalVnd: String(order.total_vnd),
        formattedTotal: `${new Intl.NumberFormat('vi-VN').format(totalNum)} ₫`,
        itemsCount: items.length,
        confirmedAt: new Date(order.confirmed_at || order.created_at || Date.now()).toISOString(),
        idempotencyKey: '',
        items: items.map((it) => ({
          sku: it.sku_snapshot,
          name: it.title_snapshot,
          unitPriceVnd: it.unit_price_vnd ? it.unit_price_vnd.toString() : '0',
          quantity: it.quantity,
          lineTotalVnd: it.line_total_vnd ? it.line_total_vnd.toString() : '0',
        })),
      });
    }

    return {
      orders: orderResults,
      total,
      page,
      limit,
    };
  }

  async getOrder(
    orderIdOrNo: string,
    principal: { id: string; role: string } = { id: 'system', role: 'ADMIN' },
  ): Promise<OrderResultDTO> {
    if (!principal) principal = { id: 'system', role: 'ADMIN' };
    const db = this.db();
    const rows = await db.manager.query(
      'SELECT * FROM orders WHERE (id::text = $1 OR order_no = $1) AND ($2 = true OR customer_id::text = $3)',
      [orderIdOrNo, principal.role === 'ADMIN', principal.id],
    );
    if (!rows.length) throw new NotFoundException('Không tìm thấy đơn hàng.');
    const order = rows[0];
    const items = await db.getRepository(OrderItem).find({ where: { order_id: order.id } });
    const totalNum = BigInt(order.total_vnd ? String(order.total_vnd) : '0');
    return {
      orderId: order.id,
      orderNo: order.order_no,
      status: order.status,
      storeId: order.store_id,
      customerId: order.customer_id,
      totalVnd: String(order.total_vnd),
      formattedTotal: `${new Intl.NumberFormat('vi-VN').format(totalNum)} ₫`,
      itemsCount: items.length,
      confirmedAt: new Date(order.confirmed_at || Date.now()).toISOString(),
      idempotencyKey: '',
      items: items.map((it) => ({
        sku: it.sku_snapshot,
        name: it.title_snapshot,
        unitPriceVnd: it.unit_price_vnd.toString(),
        quantity: it.quantity,
        lineTotalVnd: it.line_total_vnd.toString(),
      })),
    };
  }

  async cancelOrder(
    orderIdOrNo: string,
    reason = 'Khách hàng yêu cầu hủy đơn',
    principal: { id: string; role: string } = { id: 'system', role: 'ADMIN' },
  ): Promise<{ success: boolean; orderId: string; orderNo: string; status: string; message: string }> {
    const runner = this.db().createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      try {
        const order = await runner.manager
          .createQueryBuilder(Order, 'ord')
          .setLock('pessimistic_write')
          .where('ord.id::text = :id OR ord.order_no = :id', { id: orderIdOrNo })
          .getOne();
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');

        if (principal && principal.role !== 'ADMIN' && order.customer_id !== principal.id) {
          throw new ForbiddenException('Không có quyền hủy đơn hàng của người khác.');
        }

        if (order.status === 'cancelled') throw new ConflictException('Đơn hàng đã bị hủy.');
        if (order.status === 'completed') throw new ConflictException('Không thể hủy đơn hàng đã hoàn tất/thanh toán.');

        const items = await runner.manager.find(OrderItem, { where: { order_id: order.id } });
        if (!items.length) throw new ConflictException('Không thể xác nhận các sản phẩm cần hoàn kho.');

        await this.inventoryService.restoreStockInTx(
          runner,
          order.store_id,
          items.map((it) => ({ variantId: it.variant_id, quantity: it.quantity })),
        );

        order.status = 'cancelled';
        order.cancelled_at = new Date();
        await runner.manager.save(order);
        await runner.commitTransaction();

        return {
          success: true,
          orderId: order.id,
          orderNo: order.order_no,
          status: 'CANCELLED',
          message: `Đơn hàng ${order.order_no} đã được hủy. Lý do: ${reason}.`,
        };
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
  }

  async simulatePayment(
    orderIdOrNo: string,
    principal: { id: string; role: string } = { id: 'system', role: 'ADMIN' },
  ): Promise<{
    orderId: string;
    orderNo: string;
    status: string;
    paymentRef: string;
    paidAt: string;
    totalVnd: string;
    formattedTotal: string;
  }> {
    const runner = this.db().createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      try {
        const order = await runner.manager
          .createQueryBuilder(Order, 'ord')
          .setLock('pessimistic_write')
          .where('ord.id::text = :id OR ord.order_no = :id', { id: orderIdOrNo })
          .getOne();
        if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');

        if (principal && principal.role !== 'ADMIN' && order.customer_id !== principal.id) {
          throw new ForbiddenException('Không có quyền thanh toán đơn hàng của người khác.');
        }

        if (order.status === 'cancelled') {
          throw new ConflictException('Không thể thanh toán đơn hàng đã bị hủy.');
        }
        if (order.status === 'completed') {
          throw new ConflictException('Đơn hàng đã được thanh toán trước đó.');
        }

        order.status = 'completed';
        order.updated_at = new Date();
        await runner.manager.save(order);
        await runner.commitTransaction();

        const paymentRef = `SIM_PAY_${order.order_no}`;
        const totalNum = BigInt(order.total_vnd ? order.total_vnd.toString() : '0');

        return {
          orderId: order.id,
          orderNo: order.order_no,
          status: 'completed',
          paymentRef,
          paidAt: (order.updated_at || new Date()).toISOString(),
          totalVnd: String(order.total_vnd),
          formattedTotal: `${new Intl.NumberFormat('vi-VN').format(totalNum)} ₫`,
        };
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      }
    } finally {
      await runner.release();
    }
  }
}
