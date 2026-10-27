# 16 — Consistency & Concurrency Design Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/04-security-concurrency/16-CONSISTENCY_AND_CONCURRENCY.md`  
**Căn cứ đặc tả**: `docs/database/06_constraints_indexes.md`, `docs/research/commerce-flow.md` & `ADR-005`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Triết Lý Quản Lý Tranh Chấp Đồng Thời (Concurrency Philosophy)

1. **Database-First Guarantees**: Không phụ thuộc vào Redis Redlock phân tán khi chưa cần thiết. PostgreSQL 16+ với cơ chế khóa dòng bi quan (**Pessimistic Locking `SELECT ... FOR UPDATE`**) và cấp độ cô lập Read Committed trong DB Transaction là giải pháp hoàn hảo để triệt tiêu 100% rủi ro Oversell.
2. **Chiến Lược Chống Bế Tắc (Deadlock Prevention by Ordering)**: Khi một đơn hàng có nhiều mặt hàng từ các chi nhánh khác nhau, backend bắt buộc phải sắp xếp danh sách cần khóa theo thứ tự tăng dần của `(store_id, variant_id)` trước khi gọi `SELECT ... FOR UPDATE`. Điều này triệt tiêu hoàn toàn khả năng xảy ra chu trình chờ đợi lẫn nhau (Circular Wait Deadlock).
3. **Cơ Chế Fail-Fast Minh Bạch**: Khi số lượng tồn kho khả dụng không đủ ($\text{available\_qty} < \text{quantity}$), hệ thống lập tức Rollback giao dịch và trả về mã lỗi `409 Conflict` (`INSUFFICIENT_STOCK`).

---

## 2. Bảng Ma Trận Kiểm Soát Tranh Chấp Đồng Thời (Race Conditions Matrix)

| Kịch Bản Tranh Chấp | Rủi Ro Nghiệp Vụ | Bất Biến Cần Bảo Vệ | Ràng Buộc CSDL (DB Constraint) | Chiến Lược Khóa & Giao Dịch | Tính Lũy Thừa (Idempotency) |
|:--- |:--- |:--- |:--- |:--- |:---: |
| **1. Overselling khi còn 1 tồn** | 2 khách hàng bấm chốt mua chiếc laptop cuối cùng trong kho cùng 1 mili-giây. | Không bao giờ được phép bán vượt tồn: `available_qty >= 0`. | `CHECK (reserved_qty <= on_hand_qty)` | Khóa dòng bi quan: `SELECT ... FROM inventory WHERE store_id = :s AND variant_id = :v FOR UPDATE`. Request 2 chờ và nhận `409 Conflict`. | Có |
| **2. Double Checkout (Click đúp)** | Khách hàng click 2 lần nút "Xác nhận chốt đơn" do mạng giật lag. | Đơn hàng chỉ được tạo 1 lần duy nhất, không trừ kho 2 lần. | `UNIQUE (customer_id, operation, key)` tại `idempotency_keys` | Kiểm tra Idempotency Key: Nếu key đang xử lý $\to$ chờ; nếu đã thành công $\to$ trả về kết quả cũ đã lưu. | Có (qua `Idempotency-Key`) |
| **3. Trượt giá giữa Preview & Confirm** | Admin vừa tăng giá laptop từ 15 triệu lên 18 triệu trong khi khách đang xem giỏ. | Khách hàng được cam kết giá trong 10 phút sau khi tạo Preview Token. | Snapshot bất biến: `order_items.unit_price_vnd` | Preview Token chứa Signed JWT (HMAC-SHA256) lưu giá đã chốt và `expires_at = now + 10m`. Nếu quá 10m $\to$ bắt buộc preview lại. | Có |
| **4. Double Refund khi hủy đơn** | Gọi API hủy đơn liên tiếp để hoàn tồn kho nhiều lần vào chi nhánh. | Số lượng tồn kho chỉ được hoàn trả đúng 1 lần duy nhất. | Quản lý trạng thái qua FSM: `CHECK (status IN ('pending', 'confirmed', 'cancelled'))` | `SELECT status FROM orders WHERE id = :id FOR UPDATE;` Chỉ hoàn kho khi `status === 'confirmed'`; nếu đã `cancelled` $\to$ ném lỗi `409 Conflict`. | Có |
| **5. Giỏ hàng không giữ chỗ kho** | Khách hàng bỏ 10 máy vào giỏ hàng rồi bỏ đi khiến người khác không mua được. | Giỏ hàng chỉ là danh sách theo dõi cá nhân, không tác động kho. | `UNIQUE (customer_id) WHERE status = 'active'` | Thêm vào giỏ chỉ ghi bản ghi `cart_items`, không giữ chỗ kho; chỉ giữ chỗ tại bước Confirm đơn hàng. | Có |

---

## 3. Mã Nguồn Chuẩn Hóa Triển Khai Khóa Bi Quan Chống Deadlock (ADR-007 NestJS Core)

Triển khai tại NestJS Commerce Backend Core (`core-api/src/orders/orders.service.ts`):

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Inventory } from '../../entities/inventory.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: DataSource) {}

  async confirmSimulatedOrder(
    customerId: string,
    previewTokenPayload: any,
    idempotencyKey: string
  ): Promise<Order> {
    const itemsToBuy = previewTokenPayload.items; // Danh sách {storeId, variantId, quantity, priceVnd}

    // 1. SẮP XẾP TĂNG DẦN theo (storeId, variantId) để TRIỆT TIÊU HOÀN TOÀN DEADLOCK
    const sortedItems = [...itemsToBuy].sort((a, b) => {
      const cmpStore = a.storeId.localeCompare(b.storeId);
      if (cmpStore !== 0) return cmpStore;
      return a.variantId.localeCompare(b.variantId);
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Khóa dòng bi quan tuần tự từng bản ghi tồn kho liên quan
      for (const item of sortedItems) {
        const inv = await queryRunner.manager
          .createQueryBuilder(Inventory, 'inv')
          .setLock('pessimistic_write') // SELECT ... FOR UPDATE
          .where('inv.store_id = :storeId AND inv.variant_id = :variantId', {
            storeId: item.storeId,
            variantId: item.variantId,
          })
          .getOne();

        if (!inv) {
          throw new NotFoundException(`Không tìm thấy tồn kho cho biến thể ${item.variantId}`);
        }

        // 3. Kiểm tra điều kiện tồn kho khả dụng (available = onHand - reserved)
        const availableQty = inv.onHandQty - inv.reservedQty;
        if (availableQty < item.quantity) {
          throw new ConflictException(
            `Sản phẩm ${item.variantId} đã hết hàng khả dụng (còn: ${availableQty})`
          );
        }

        // 4. Giữ chỗ tồn kho nguyên tử
        inv.reservedQty += item.quantity;
        await queryRunner.manager.save(inv);
      }

      // 5. Tạo đơn hàng và snapshot chi tiết giá bất biến NUMERIC(18, 0)
      const order = queryRunner.manager.create(Order, {
        customerId,
        storeId: previewTokenPayload.storeId,
        status: 'confirmed',
        totalAmountVnd: previewTokenPayload.totalAmountVnd,
      });
      const savedOrder = await queryRunner.manager.save(order);

      for (const item of sortedItems) {
        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceVnd: item.priceVnd,
          subtotalVnd: (BigInt(item.priceVnd) * BigInt(item.quantity)).toString(),
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```
