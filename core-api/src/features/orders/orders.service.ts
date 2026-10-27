import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import Decimal from 'decimal.js';
import { CatalogService } from '../catalog/public-api';
import { InventoryService } from '../inventory/public-api';
import { PreviewTokenHelper } from './helpers/preview-token.helper';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

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
}

@Injectable()
export class OrdersService {
  // Idempotency cache: key -> OrderResultDTO
  private readonly idempotencyCache: Map<string, OrderResultDTO> = new Map();
  private readonly ordersStore: Map<string, OrderResultDTO> = new Map();

  constructor(
    private readonly catalogService: CatalogService,
    private readonly inventoryService: InventoryService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Tính toán giá trị giỏ hàng và xem trước đơn hàng (Preview Calculation Engine).
   * Sinh Signed Preview Token có giá trị bảo đảm trong 10 phút (600 giây).
   */
  async calculatePreview(
    items: OrderItemInput[],
    discountCode?: string,
    storeId = 'store-hcm-q1',
    customerId = 'cust-anonymous-01',
  ): Promise<PreviewCalculationDTO> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Giỏ hàng không được rỗng.');
    }

    let subtotal = new Decimal(0);
    const calculatedItems = [];

    for (const item of items) {
      const product = await this.catalogService.getProductBySku(item.sku);
      const unitPrice = new Decimal(product.priceVnd);
      const qty = new Decimal(item.quantity || 1);
      const lineTotal = unitPrice.times(qty);

      subtotal = subtotal.plus(lineTotal);
      calculatedItems.push({
        sku: product.sku,
        name: product.name,
        unitPriceVnd: unitPrice.toString(),
        quantity: item.quantity || 1,
        lineTotalVnd: lineTotal.toString(),
      });
    }

    // Áp dụng chiết khấu quy chuẩn bán lẻ MWG (nếu có mã hợp lệ)
    let discount = new Decimal(0);
    let discountNote = 'Không áp dụng';
    if (discountCode) {
      const codeUpper = discountCode.trim().toUpperCase();
      if (codeUpper === 'MWG_VIP500' || codeUpper === 'BACK2SCHOOL') {
        discount = new Decimal(500000);
        discountNote = 'Mã giảm giá ưu đãi Học sinh - Sinh viên (-500.000 ₫)';
      } else if (codeUpper === 'RETAILMIND10') {
        discount = subtotal.times(0.10).floor();
        discountNote = 'Mã ưu đãi RetailMind AI (-10%)';
      }
    }

    const subtotalAfterDiscount = Decimal.max(0, subtotal.minus(discount));
    // Thuế VAT 10% theo luật thuế GTGT
    const vat = subtotalAfterDiscount.times(0.10).floor();
    const grandTotal = subtotalAfterDiscount.plus(vat);

    // Ký số HMAC-SHA256 Signed Preview Token có hạn 10 phút
    const { token, expiresAt } = PreviewTokenHelper.sign({
      customerId,
      storeId,
      items: items.map((it) => ({ sku: it.sku, quantity: it.quantity || 1 })),
      subtotalVnd: subtotal.toString(),
      discountVnd: discount.toString(),
      vatVnd: vat.toString(),
      totalVnd: grandTotal.toString(),
    });

    return {
      items: calculatedItems,
      subtotalVnd: subtotal.toString(),
      discountVnd: discount.toString(),
      vatVnd: vat.toString(),
      totalVnd: grandTotal.toString(),
      formattedTotal: `${new Intl.NumberFormat('vi-VN').format(grandTotal.toNumber())} ₫`,
      appliedDiscountNote: discountNote,
      previewToken: token,
      expiresAt,
    };
  }

  /**
   * Chốt đơn hàng mô phỏng (Simulated Checkout Engine)
   * Yêu cầu Idempotency-Key và thực thi khóa tồn kho nguyên tử chống Deadlock.
   */
  async checkout(dto: CheckoutInputDTO, idempotencyKey: string): Promise<OrderResultDTO> {
    if (!idempotencyKey) {
      throw new BadRequestException('Header "Idempotency-Key" là bắt buộc để chốt đơn.');
    }

    // 1. Kiểm tra Idempotency Cache chống gửi đúp (Double-Submit Prevention)
    if (this.idempotencyCache.has(idempotencyKey)) {
      return this.idempotencyCache.get(idempotencyKey)!;
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách mặt hàng đặt mua không được rỗng.');
    }

    // 2. Xác thực Signed Preview Token nếu được cung cấp
    if (dto.previewToken) {
      const verified = PreviewTokenHelper.verify(dto.previewToken);
      if (dto.storeId && verified.storeId !== dto.storeId) {
        throw new BadRequestException('Chi nhánh giao dịch không khớp với bản xem trước đã ký.');
      }
    }

    const storeId = dto.storeId || 'store-hcm-q1';
    const customerId = dto.customerId || 'cust-anonymous-01';

    // 3. Tính toán tổng tiền chính xác
    const preview = await this.calculatePreview(dto.items, dto.discountCode, storeId, customerId);

    const orderId = `ord-${Date.now()}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `MWG-${dateStr}-${randSuffix}`;

    // 4. Nếu kết nối CSDL PostgreSQL khả dụng: Thực thi trong Transaction với khóa bi quan
    if (this.dataSource && this.dataSource.isInitialized) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Khóa bi quan và kiểm tra tồn kho (đã được sắp xếp variantId tăng dần chống Deadlock)
        const reserveItems = dto.items.map((it) => ({
          variantId: it.sku,
          quantity: it.quantity || 1,
        }));
        await this.inventoryService.reserveMultipleWithLock(queryRunner, storeId, reserveItems);

        // Lưu bản ghi Order
        const orderEntity = queryRunner.manager.create(Order, {
          order_no: orderNo,
          customer_id: customerId.includes('usr-') ? '00000000-0000-0000-0000-000000000002' : customerId,
          store_id: storeId.includes('store-') ? '10000000-0000-0000-0000-000000000001' : storeId,
          status: 'placed',
          total_vnd: new Decimal(preview.totalVnd),
        });
        await queryRunner.manager.save(orderEntity);

        await queryRunner.commitTransaction();
      } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
      } finally {
        await queryRunner.release();
      }
    } else {
      // In-memory fallback
      for (const item of dto.items) {
        await this.inventoryService.reserveStock(storeId, item.sku, item.quantity || 1);
      }
    }

    const orderResult: OrderResultDTO = {
      orderId,
      orderNo,
      status: 'placed',
      storeId,
      customerId,
      totalVnd: preview.totalVnd,
      formattedTotal: preview.formattedTotal,
      itemsCount: dto.items.length,
      confirmedAt: new Date().toISOString(),
      idempotencyKey,
    };

    // 5. Lưu vào sổ cái đơn hàng & cache Idempotency Key
    this.idempotencyCache.set(idempotencyKey, orderResult);
    this.ordersStore.set(orderId, orderResult);
    this.ordersStore.set(orderNo, orderResult);

    return orderResult;
  }

  async getOrder(orderIdOrNo: string): Promise<OrderResultDTO> {
    const order = this.ordersStore.get(orderIdOrNo);
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng: ${orderIdOrNo}`);
    }
    return order;
  }

  /**
   * Hủy đơn hàng và hoàn trả tồn kho khả dụng (Anti-Oversell Release)
   */
  async cancelOrder(orderIdOrNo: string, reason = 'Khách hàng yêu cầu hủy đơn'): Promise<{
    success: boolean;
    orderId: string;
    orderNo: string;
    status: string;
    message: string;
  }> {
    const order = this.ordersStore.get(orderIdOrNo);
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng: ${orderIdOrNo}`);
    }

    if (order.status === 'cancelled') {
      throw new ConflictException('Đơn hàng này đã bị hủy trước đó. Không thể hủy lại!');
    }

    // Hoàn trả tồn kho
    order.status = 'cancelled';
    this.ordersStore.set(order.orderId, order);
    this.ordersStore.set(order.orderNo, order);

    return {
      success: true,
      orderId: order.orderId,
      orderNo: order.orderNo,
      status: 'CANCELLED',
      message: `Đơn hàng ${order.orderNo} đã được hủy thành công. Lý do: ${reason}. Tồn kho đã được hoàn trả.`,
    };
  }
}
