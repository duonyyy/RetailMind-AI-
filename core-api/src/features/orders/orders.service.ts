import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { CatalogService } from '../catalog/catalog.service';
import { InventoryService } from '../inventory/services/inventory.service';

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
}

export interface CheckoutInputDTO {
  storeId: string;
  customerId?: string;
  items: OrderItemInput[];
  discountCode?: string;
  paymentMethod?: string;
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
  ) {}

  /**
   * Tính toán giá trị giỏ hàng và xem trước đơn hàng (Preview Calculation Engine).
   * Tuân thủ quy chuẩn số học: Toàn bộ phép tính sử dụng decimal.js để triệt tiêu sai số làm tròn.
   */
  async calculatePreview(
    items: OrderItemInput[],
    discountCode?: string,
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

    return {
      items: calculatedItems,
      subtotalVnd: subtotal.toString(),
      discountVnd: discount.toString(),
      vatVnd: vat.toString(),
      totalVnd: grandTotal.toString(),
      formattedTotal: `${new Intl.NumberFormat('vi-VN').format(grandTotal.toNumber())} ₫`,
      appliedDiscountNote: discountNote,
    };
  }

  /**
   * Chốt đơn hàng mô phỏng (Simulated Checkout Engine)
   * Yêu cầu Idempotency-Key và thực thi khóa tồn kho nguyên tử.
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

    const storeId = dto.storeId || 'store-hcm-q1';
    const customerId = dto.customerId || 'cust-anonymous-01';

    // 2. Kiểm tra và tạm giữ kho cho từng sản phẩm (Khóa bi quan Anti-Oversell)
    for (const item of dto.items) {
      await this.inventoryService.reserveStock(storeId, item.sku, item.quantity || 1);
    }

    // 3. Tính toán tổng tiền chính xác
    const preview = await this.calculatePreview(dto.items, dto.discountCode);

    // 4. Khởi tạo đơn hàng bất biến
    const orderId = `ord-${Date.now()}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNo = `MWG-${dateStr}-${randSuffix}`;

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
}
