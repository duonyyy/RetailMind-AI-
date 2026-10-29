# 04 — Internal Tool Gateway Specification (Agent-to-NestJS Protocol)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/05-backend/04-INTERNAL_TOOL_GATEWAY.md`  
**Căn cứ đặc tả**: `AGENTS.md`, `ADR-002`, `ADR-007` & `docs/architecture/02_api_and_tool_contracts.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Đặt Vấn Đề: Ranh Giới An Toàn Cho Tác Tử AI (Zero-Trust Agent Boundary)

Theo quy định tối thượng của **Hiến pháp Vận hành Kỹ thuật (`AGENTS.md`)**:
$$\text{LLM Proposes (Tool Call)} \longrightarrow \text{Typed Validation (Pydantic)} \longrightarrow \text{Authz Check (Server-Side)} \longrightarrow \text{NestJS Backend Executes}$$

Tác tử AI (Python LangGraph) chạy độc lập trên port 8000 và **tuyệt đối không được cấp thông tin kết nối CSDL PostgreSQL**. Mọi hành động đọc dữ liệu sản phẩm, kiểm tra kho hay thêm hàng vào giỏ đều bắt buộc phải thông qua **Cổng Kết Nối Công Cụ Nội Bộ (Internal Tool Gateway)** do NestJS Backend (port 4000) cung cấp.

---

## 2. Giao Thức Bảo Mật & Xác Thực Liên Dịch Vụ (Service-to-Service Security)

Mọi lời gọi từ Python AI Agent tới NestJS Gateway (`POST /internal/tools/*`) bắt buộc phải có các Headers:

| Tên Header | Ý Nghĩa Kỹ Thuật | Kiểm Tra Tại NestJS |
|---|---|---|
| `X-Internal-Secret` | Chuỗi khóa bí mật chia sẻ giữa các container nội bộ trong mạng Docker | `InternalSecretGuard` so khớp với biến môi trường `INTERNAL_API_SECRET`. Nếu sai $\longrightarrow$ `403 Forbidden`. |
| `X-Customer-Id` | UUID của khách hàng sở hữu phiên hội thoại AI | NestJS sử dụng ID này để truy xuất giỏ hàng/đơn hàng, **ngăn chặn IDOR hoàn toàn** (Agent không thể mạo danh khách hàng khác). |
| `X-Trace-Id` | UUIDv4 định danh chuỗi truy vết phân tán | Ghi nhận vào OpenTelemetry Spans để đồng bộ trace giữa Agent và Backend. |

```typescript
// core-api/src/shared/guards/internal-secret.guard.ts
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-internal-secret'];
    const expectedSecret = this.configService.get<string>('INTERNAL_TOOL_SECRET') || this.configService.get<string>('INTERNAL_API_SECRET');

    if (!secret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid internal service credentials');
    }
    return true;
  }
}
```

---

## 3. Danh Mục Đặc Tả 16 Endpoints Công Cụ Nội Bộ (/api/v1/internal/tools/*)

Hệ thống hỗ trợ cả dạng chuẩn RESTful snake_case lẫn alias kebab-case để tương thích ngược 100% với Python Agent:

| STT | Endpoint URL & Alias | Input Payload (JSON) | Service Xử Lý Trong NestJS | Quyền Hạn |
|:---:|---|---|---|:---:|
| 1 | `POST /internal/tools/search_products`<br/>*(alias: `catalog-search`)* | `{ query?: string, min_price?: string, max_price?: string, min_ram_gb?: number }` | `CatalogService.getProducts()` | Public |
| 2 | `POST /internal/tools/get_product_details`<br/>*(alias: `product-detail`)* | `{ variant_id?: string, sku?: string }` | `CatalogService.getProductBySku()` | Public |
| 3 | `POST /internal/tools/compare_products`<br/>*(alias: `compare-products`)* | `{ variant_ids?: string[], skus?: string[] }` (2–4 items) | `CatalogService.compareVariants()` | Public |
| 4 | `POST /internal/tools/check_inventory`<br/>*(alias: `inventory-check`)* | `{ variant_id?: string, sku?: string, store_id?: string }` | `InventoryService.getStock()` | Public |
| 5 | `POST /internal/tools/search_policy`<br/>*(alias: `policy-search`)* | `{ query: string, top_k?: number }` | `KnowledgeService.searchPolicy()` | Public |
| 6 | `POST /internal/tools/view_cart`<br/>*(alias: `cart-view`)* | `{}` *(Lấy `customer_id` từ `X-Customer-Id`)* | `CartService.getCartDetails()` | Customer |
| 7 | `POST /internal/tools/add_to_cart`<br/>*(alias: `cart-add`)* | `{ variant_id: string, quantity: number }` | `CartService.addItem()` | Customer |
| 8 | `POST /internal/tools/remove_from_cart`<br/>*(alias: `cart-remove`)* | `{ variant_id: string, item_id?: string }` | `CartService.removeItem()` | Customer |
| 9 | `POST /internal/tools/preview_order`<br/>*(alias: `order-preview`)* | `{ store_id?: string, items?: OrderItemInput[] }` | `OrdersService.calculatePreview()` | Customer |
| 10 | `POST /internal/tools/get_order_status`<br/>*(alias: `order-status`)* | `{ order_no?: string, order_id?: string }` | `OrdersService.getOrder()` | Customer |
| 11 | `POST /internal/tools/lookup_order` | `{ order_id: string }` *(Tra cứu chi tiết phân lập PII)* | `OrdersService.getOrder()` | Customer |
| 12 | `POST /internal/tools/cancel_simulated_order`<br/>*(alias: `cancel-order`)* | `{ order_id: string, reason?: string }` | `OrdersService.cancelOrder()` *(Hoàn tồn kho)* | Customer |
| 13 | `POST /internal/tools/create_support_ticket`<br/>*(alias: `ticket-create`)* | `{ order_id: string, title: string, description: string }` | `SupportService.createTicket()` | Customer |
| 14 | `POST /internal/tools/manage_favorite` | `{ sku?: string, variant_id?: string, action: 'add' \| 'remove' }` | `CustomersService` / `Favorites` | Customer |
| 15 | `POST /internal/tools/calculate_contract_penalty` | `{ contract_value_vnd: string, breach_type: string }` | SafeMath Governance Tool | Customer |
| 16 | `POST /internal/tools/request_return_or_refund` | `{ order_id: string, amount_vnd: string, reason: string }` | Governance & HITL Approval Queue | Customer |

---

## 4. Điều Khoản Cấm Tuyệt Đối: Không Cung Cấp Tool Chốt Đơn

> [!CAUTION]
> **Quy Tắc An Toàn Bất Di Bất Dịch:**  
> Hệ thống **TUYỆT ĐỐI KHÔNG CUNG CẤP** công cụ `confirm_order` cho Tác tử AI.  
> Tác tử AI chỉ được dừng lại ở bước gọi `preview_order` để sinh ra một bản xem trước kèm **Signed Preview Token** ngắn hạn (10 phút). Thao tác chốt đơn thật sự bắt buộc phải do chính khách hàng bấm nút xác nhận tường minh trên giao diện Web UI với chữ ký token đó.
