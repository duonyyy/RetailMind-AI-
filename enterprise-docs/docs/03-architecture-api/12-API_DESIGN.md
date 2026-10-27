# 12 — API Design & Contract Specification (Đặc Tả Hợp Đồng Giao Diện Lập Trình)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/03-architecture-api/12-API_DESIGN.md`  
**Phiên bản**: Production 2026 Edition  
**Tiêu chuẩn kiến trúc**: RESTful JSON API (`/api/v1`), Server-Sent Events (SSE) & BFF Reverse Proxy  
**Căn cứ đặc tả**: `AGENTS.md`, `ADR-007` (Polyglot Stack), `ADR-009` (BFF & Clean Architecture), `09-DATABASE_DESIGN.md`, `SCREEN_SPECIFICATIONS.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 📑 MỤC LỤC TỔNG QUAN

1. [Chuẩn Phong Bì Phản Hồi Đồng Nhất (Uniform API Envelope)](#1-chuẩn-phong-bì-phản-hồi-đồng-nhất-uniform-api-envelope)
2. [Bảng Danh Mục Toàn Diện Các REST API Endpoints (/api/v1)](#2-bảng-danh-mục-toàn-diện-các-rest-api-endpoints-apiv1)
   - [2.1. Phân Hệ Xác Thực & Quản Lý Truy Cập (Auth & Accounts)](#21-phân-hệ-xác-thực--quản-lý-truy-cập-auth--accounts)
   - [2.2. Phân Hệ Danh Mục & Tìm Kiếm Ngữ Nghĩa (Catalog & Search)](#22-phân-hệ-danh-mục--tìm-kiếm-ngữ-nghĩa-catalog--search)
   - [2.3. Phân Hệ Tồn Kho Chi Nhánh Đa Kênh (Inventory & Store Hubs)](#23-phân-hệ-tồn-kho-chi-nhánh-đa-kênh-inventory--store-hubs)
   - [2.4. Phân Hệ Giỏ Hàng & Chốt Đơn Khóa Tồn (Cart & Orders)](#24-phân-hệ-giỏ-hàng--chốt-đơn-khóa-tồn-cart--orders)
   - [2.5. Phân Hệ Bảo Hành & Hỗ Trợ Khách Hàng (Warranty & Support)](#25-phân-hệ-bảo-hành--hỗ-trợ-khách-hàng-warranty--support)
   - [2.6. Phân Hệ Khuyến Mãi & Quy Tắc Giá SSOT (Promotions Engine)](#26-phân-hệ-khuyến-mãi--quy-tắc-giá-ssot-promotions-engine)
   - [2.7. Phân Hệ Quản Trị Vận Hành, HITL Gate & Audit (Governance & Operations)](#27-phân-hệ-quản-trị-vận-hành-hitl-gate--audit-governance--operations)
   - [2.8. Phân Hệ Giám Sát Sức Khỏe & Chống Chịu (Health & Resilience)](#28-phân-hệ-giám-sát-sức-khỏe--chống-chịu-health--resilience)
3. [Đặc Tả Chuẩn Server-Sent Events (SSE Streaming Protocol)](#3-đặc-tả-chuẩn-server-sent-events-sse-streaming-protocol)
4. [Đặc Tả 13 Công Cụ Của Tác Tử AI (Pydantic Typed Tools Contract)](#4-đặc-tả-13-công-cụ-của-tác-tử-ai-pydantic-typed-tools-contract)
5. [Quy Chuẩn An Toàn & Ràng Buộc Kỹ Thuật Bắt Buộc](#5-quy-chuẩn-an-toàn--ràng-buộc-kỹ-thuật-bắt-buộc)

---

## 1. CHUẨN PHONG BÌ PHẢN HỒI ĐỒNG NHẤT (UNIFORM API ENVELOPE)

Mọi phản hồi RESTful từ hệ sinh thái API của **RetailMind AI** đều tuân thủ cấu trúc phong bì 4 khối bất biến:

### 1.1. Phản hồi thành công (HTTP 200 OK / 201 Created)
```json
{
  "success": true,
  "data": {
    "order_id": "ord-20261026-9812",
    "order_no": "MWG-20261026-9812",
    "status": "placed",
    "total_amount_vnd": "19239000",
    "formatted_total": "19.239.000 ₫",
    "reserved_at_store": "MWG_HCM_001"
  },
  "error": null,
  "meta": {
    "request_id": "req-c8d7e9f1-4b2a-4f9e-8c3d-1a2b3c4d5e6f",
    "timestamp": "2026-10-26T15:45:00.000Z",
    "server_version": "v1.0-2026"
  }
}
```

### 1.2. Phản hồi lỗi nghiệp vụ (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Số lượng tồn kho khả dụng tại chi nhánh đã chọn không đủ để hoàn tất chốt đơn.",
    "details": {
      "variant_id": "var-asus-vivobook-15",
      "sku": "LT-ASUS-VIVO15-OLED",
      "store_id": "store-hcm-q1",
      "requested_quantity": 2,
      "available_quantity": 1
    }
  },
  "meta": {
    "request_id": "req-f9a8b7c6-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
    "timestamp": "2026-10-26T15:45:01.120Z",
    "server_version": "v1.0-2026"
  }
}
```

---

## 2. BẢNG DANH MỤC TOÀN DIỆN CÁC REST API ENDPOINTS (/api/v1)

### 2.1. Phân Hệ Xác Thực & Quản Lý Truy Cập (Auth & Accounts)

Hỗ trợ các màn hình **`SCR-01`** (Auth Portal) và **`SCR-13`** (Hồ Sơ & Quyền Riêng Tư PII):

| Method | Endpoint URL | Mục Đích Nghiệp Vụ | Quyền Hạn (RBAC) | Headers Bắt Buộc | Status Code |
| :---: | :--- | :--- | :---: | :--- | :---: |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản Customer mới, băm mật khẩu Argon2id | Public | `Content-Type: application/json` | `201 Created` |
| `POST` | `/api/v1/auth/login` | Xác thực đăng nhập, trả Access Token (15m) & Refresh Cookie | Public | `Content-Type: application/json` | `200 OK` |
| `POST` | `/api/v1/auth/refresh` | Cấp mới Access Token từ Refresh Token an toàn | Public | Cookie `retailmind_refresh_token` | `200 OK` |
| `POST` | `/api/v1/auth/logout` | Đăng xuất, vô hiệu hóa Token và làm sạch Cookie | Authenticated | `Authorization: Bearer <token>` | `200 OK` |
| `GET` | `/api/v1/auth/me` | Lấy thông tin hồ sơ, vai trò và quyền hạn phiên làm việc | Authenticated | `Authorization: Bearer <token>` | `200 OK` |
| `POST` | `/api/v1/privacy/export-data` | Xuất toàn bộ dữ liệu cá nhân (Data Portability NĐ 13/2023) | `role:CUSTOMER` | `Authorization: Bearer <token>` | `200 OK` |
| `POST` | `/api/v1/privacy/request-deletion`| Yêu cầu xóa vĩnh viễn tài khoản và làm sạch PII | `role:CUSTOMER` | `Authorization: Bearer <token>` | `202 Accepted` |

---

### 2.2. Phân Hệ Danh Mục & Tìm Kiếm Ngữ Nghĩa (Catalog & Search)

Hỗ trợ các màn hình **`SCR-02`** (Trang Chủ), **`SCR-03`** (Danh Mục Đa Chiều), **`SCR-04`** (Chi Tiết PDP) và **`SCR-05`** (So Sánh):

| Method | Endpoint URL | Query / Body Parameters | Mô Tả Nghiệp Vụ | Status Code |
| :---: | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/catalog/products` | `search, brand, minPrice, maxPrice, minRam, page, limit` | Lấy danh mục laptop có phân trang, hỗ trợ tìm kiếm không dấu (unaccent) | `200 OK` |
| `GET` | `/api/v1/catalog/products/:sku` | Path param: `sku` (VD: `LT-ASUS-VIVO15-OLED`) | Lấy toàn diện thông số kỹ thuật chi tiết của sản phẩm từ PostgreSQL SSOT | `200 OK` |
| `GET` | `/api/v1/catalog/compare` | `skus=LT-ASUS-VIVO15,LT-LENOVO-TB14` (từ 2 đến 4 SKUs) | Trả về ma trận so sánh trực diện cấu hình và làm nổi bật máy có giá tốt nhất | `200 OK` |
| `POST` | `/api/v1/search/semantic` | Body: `{ "query": "laptop duoi 20tr ram 16gb", "top_k": 5 }` | Tìm kiếm ngữ nghĩa qua chỉ mục Vector Qdrant kết hợp Reranker | `200 OK` |

---

### 2.3. Phân Hệ Tồn Kho Chi Nhánh Đa Kênh (Inventory & Store Hubs)

Hỗ trợ các màn hình **`SCR-04`** (Tồn kho tại PDP), **`SCR-08`** (Chọn điểm nhận) và **`SCR-16`** (Quản Trị Kho Chi Nhánh):

| Method | Endpoint URL | Mô Tả Nghiệp Vụ & Ràng Buộc Đồng Thời | Quyền Hạn | Status Code |
| :---: | :--- | :--- | :---: | :---: |
| `GET` | `/api/v1/inventory/stores` | Lấy danh sách siêu thị MWG Hubs (địa chỉ, tọa độ, giờ mở cửa) | Public | `200 OK` |
| `GET` | `/api/v1/inventory/stock` | Query: `storeId, variantId` &rarr; Trả về tồn vật lý, tồn khóa và tồn khả dụng | Public | `200 OK` |
| `POST` | `/api/v1/inventory/reserve` | Tạm giữ tồn kho khả dụng bằng khóa bi quan `setLock('pessimistic_write')` | `role:CUSTOMER` | `200 OK` |
| `PUT` | `/api/v1/admin/inventory/adjust` | Điều chỉnh tồn kho kiểm kê định kỳ, bắt buộc ghi vết kiểm toán SHA-256 | `role:ADMIN` | `200 OK` |

---

### 2.4. Phân Hệ Giỏ Hàng & Chốt Đơn Khóa Tồn (Cart & Orders)

Hỗ trợ các màn hình **`SCR-07`** (Giỏ Hàng), **`SCR-08`** (Checkout), **`SCR-09`** (Biên Nhận) và **`SCR-10`** (Lịch Sử Đơn):

| Method | Endpoint URL | Headers & Ràng Buộc Kỹ Thuật | Mô Tả Nghiệp Vụ | Status Code |
| :---: | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/cart` | Header `X-Customer-Id` (chống IDOR) | Xem chi tiết giỏ hàng và danh sách sản phẩm tạm tính | `200 OK` |
| `POST` | `/api/v1/cart/items` | Body: `{ "sku": "...", "quantity": 1 }` | Thêm biến thể laptop vào giỏ hàng | `201 Created` |
| `DELETE` | `/api/v1/cart/items/:sku` | Path param: `sku` | Xóa sản phẩm khỏi giỏ hàng | `200 OK` |
| `POST` | `/api/v1/orders/preview` | Body: `{ "items": [...], "discountCode": "MWG_VIP500" }` | Tính toán bảng tiền chính xác Decimal, cấp `preview_token` hiệu lực 10m | `200 OK` |
| `POST` | `/api/v1/orders/checkout` | **Bắt buộc Header: `Idempotency-Key: <uuid>`** | **Chốt đơn hàng chính thức**: Khóa bi quan kho, ghi nhận đơn vào PostgreSQL SSOT | `201 Created` |
| `GET` | `/api/v1/orders` | Hỗ trợ phân trang: `page, limit, status` | Lấy danh sách lịch sử đơn hàng cá nhân của khách hàng | `200 OK` |
| `GET` | `/api/v1/orders/:id` | Path param: `id` (Mã đơn hoặc UUID) | Lấy chi tiết đơn hàng, snapshot cấu hình lúc mua và mã QR nhận hàng | `200 OK` |
| `POST` | `/api/v1/orders/:id/cancel`| Body: `{ "reason": "Đổi sang máy khác" }` | Hủy đơn hàng giả lập, tự động hoàn trả số lượng khả dụng vào chi nhánh | `200 OK` |

---

### 2.5. Phân Hệ Bảo Hành & Hỗ Trợ Khách Hàng (Warranty & Support)

Hỗ trợ các màn hình **`SCR-11`** (Cổng Bảo Hành) và **`SCR-12`** (Trung Tâm Hỗ Trợ & Ticket):

| Method | Endpoint URL | Query / Body Parameters | Mô Tả Nghiệp Vụ | Status Code |
| :---: | :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/warranty/lookup` | `serial` hoặc `orderNo` (VD: `MWG-20261026-9812`) | Tra cứu hạn bảo hành 24 tháng chính hãng và số ngày còn lại trong chính sách đổi trả 30 ngày | `200 OK` |
| `POST` | `/api/v1/warranty/claims` | Body: `{ "serial": "...", "defectDescription": "...", "storeId": "..." }` | Tạo yêu cầu thẩm định lỗi kỹ thuật đổi máy mới 1-1 trong 30 ngày | `201 Created` |
| `GET` | `/api/v1/support/tickets` | Query: `status, page, limit` | Lấy danh sách các phiếu yêu cầu hỗ trợ cá nhân | `200 OK` |
| `POST` | `/api/v1/support/tickets` | Body: `{ "orderId": "...", "topic": "RETURN", "description": "..." }` | Tạo phiếu khiếu nại đính kèm bằng chứng gửi đội ngũ CSKH MWG | `201 Created` |

---

### 2.6. Phân Hệ Khuyến Mãi & Quy Tắc Giá SSOT (Promotions Engine)

Hỗ trợ các màn hình **`SCR-07`** (Giỏ Hàng), **`SCR-08`** (Checkout) và **`SCR-20`** (Quản Trị Khuyến Mãi):

| Method | Endpoint URL | Quyền Hạn | Mô Tả Nghiệp Vụ | Status Code |
| :---: | :--- | :---: | :--- | :---: |
| `GET` | `/api/v1/promotions/active` | Public | Lấy danh sách mã khuyến mãi đang có hiệu lực toàn hệ thống | `200 OK` |
| `POST` | `/api/v1/promotions/validate` | Customer | Kiểm tra điều kiện áp dụng voucher trên Server (giá trị đơn tối thiểu, số lượt còn lại) | `200 OK` |
| `POST` | `/api/v1/admin/promotions` | `role:ADMIN` | Tạo mới chương trình ưu đãi, mã giảm giá, giới hạn ngân sách chiết khấu | `201 Created` |
| `PUT` | `/api/v1/admin/promotions/:id`| `role:ADMIN` | Tạm dừng hoặc kích hoạt lại chương trình khuyến mãi | `200 OK` |

---

### 2.7. Phân Hệ Quản Trị Vận Hành, HITL Gate & Audit (Governance & Operations)

Hỗ trợ các màn hình **`SCR-14`** (Dashboard), **`SCR-18`** (HITL Gate), **`SCR-19`** (RAG Hub), **`SCR-21`** (Phoenix) và **`SCR-22`** (Audit Logs):

| Method | Endpoint URL | Quyền Hạn | Mô Tả Nghiệp Vụ & Ràng Buộc Hiến Pháp | Status Code |
| :---: | :--- | :---: | :--- | :---: |
| `GET` | `/api/v1/admin/analytics/overview`| `role:ADMIN` | Tổng hợp doanh thu, đơn hàng, tỷ lệ chuyển đổi tư vấn AI theo ngày | `200 OK` |
| `GET` | `/api/v1/admin/hitl/queue` | `role:ADMIN` | Lấy hàng đợi tác vụ nhạy cảm (> 200k hoặc can thiệp chính sách) đang chờ duyệt | `200 OK` |
| `POST` | `/api/v1/admin/hitl/:id/action` | `role:ADMIN` | Quản lý xác nhận `APPROVE` hoặc `REJECT` tác vụ bồi hoàn (Ghi Sổ cái SHA-256) | `200 OK` |
| `GET` | `/api/v1/admin/audit-ledger` | `role:ADMIN` | Truy vấn các khối băm trong chuỗi băm liên hoàn (Tamper-Evident Hash Chain) | `200 OK` |
| `POST` | `/api/v1/admin/knowledge/sync` | `role:ADMIN` | Kích hoạt tiến trình nạp vector HNSW vào Qdrant cho văn bản chính sách mới | `202 Accepted` |
| `GET` | `/api/v1/admin/finops/ledger` | `role:ADMIN` | Báo cáo chi phí token chi tiết và độ trễ TTFT trích xuất từ DuckDB | `200 OK` |

---

### 2.8. Phân Hệ Giám Sát Sức Khỏe & Chống Chịu (Health & Resilience)

Hỗ trợ màn hình **`SCR-27`** (Service Health Dashboard) và Kubernetes / Docker Probes:

| Method | Endpoint URL | Mô Tả Nghiệp Vụ | Status Code |
| :---: | :--- | :--- | :---: |
| `GET` | `/api/v1/health` | Kiểm tra kết nối 5 trụ cột: PostgreSQL, Qdrant, Redis, NestJS Core, LangGraph Agent | `200 OK` (Healthy) / `503` (Degraded) |
| `GET` | `/api/v1/health/liveness` | Kubernetes Liveness Probe kiểm tra tiến trình sống | `200 OK` |
| `GET` | `/api/v1/health/readiness` | Kubernetes Readiness Probe kiểm tra sẵn sàng nhận tải giao dịch | `200 OK` |

---

## 3. ĐẶC TẢ CHUẨN SERVER-SENT EVENTS (SSE STREAMING PROTOCOL)

Hội thoại tư vấn giữa khách hàng và AI Agent (`SCR-06`) thực thi qua luồng Server-Sent Events với endpoint `/api/proxy/chat/stream` (BFF Proxy chuyển tiếp với `duplex: 'half'`):

### 3.1. Danh mục các sự kiện SSE chuẩn (Event Types)
```text
event: thought
data: {"content": "[LỚP 1 - SEMANTIC CACHE] Nạp chỉ mục L1 Vector Cache (<5ms, $0 token)."}

event: token
data: {"content": "Theo "}

event: token
data: {"content": "danh mục sản phẩm MWG 2026, dòng laptop tối ưu nhất là..."}

event: tool_call
data: {"tool": "check_inventory", "arguments": {"sku": "LT-ASUS-VIVO15-OLED", "store_id": "store-hcm-q1"}}

event: citations
data: [{"title": "Chính Sách Bảo Hành & Đổi Trả MWG 2026", "statute": "Điều 1", "page": 3, "doc_hash": "d1e2f3a4"}]

event: grounding_score
data: {"score": 0.98, "faithfulness": "PASS"}

event: hitl_pending
data: {"task_id": "task-hitl-8821", "reason": "Khoản chi bồi hoàn 500.000 VNĐ vượt hạn mức AI tự động."}

event: done
data: {"status": "completed", "total_tokens": 342, "latency_ms": 118}
```

---

## 4. ĐẶC TẢ 13 CÔNG CỤ CỦA TÁC TỬ AI (PYDANTIC TYPED TOOLS CONTRACT)

Mọi yêu cầu từ tác tử LangGraph gửi sang NestJS qua route nội bộ `/api/v1/internal/tools/*` đều được bảo vệ nghiêm ngặt bởi `InternalSecretGuard` (Header: `x-internal-secret`) và định kiểu Pydantic v2:

| STT | Tên Tool | Endpoint Ánh Xạ Nội Bộ | Input Schema (Pydantic) | Ràng Buộc SSOT & An Toàn |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `search_products` | `POST /internal/tools/search_products` | `query: str, min_price: Optional[Decimal], max_price: Optional[Decimal], min_ram_gb: Optional[int]` | Truy vấn bảng Products & Variants (SSOT) |
| 2 | `get_product_details` | `POST /internal/tools/get_product_details`| `sku: str` | Lấy chi tiết thông số và giá niêm yết |
| 3 | `compare_products` | `POST /internal/tools/compare_products` | `skus: List[str]` (từ 2 đến 4 items) | So sánh đối đầu thông số kỹ thuật |
| 4 | `check_inventory` | `POST /internal/tools/check_inventory` | `sku: str, store_id: Optional[str]` | Tra cứu tồn khả dụng thực tế tại kho chi nhánh |
| 5 | `search_policy` | `POST /internal/tools/search_policy` | `query: str, top_k: int = 3` | Tìm kiếm tương đồng vector RAG trong Qdrant |
| 6 | `view_cart` | `POST /internal/tools/view_cart` | *(Lấy theo Header `X-Customer-Id`)* | Xem giỏ hàng cá nhân (Chống IDOR 100%) |
| 7 | `add_to_cart` | `POST /internal/tools/add_to_cart` | `sku: str, quantity: int >= 1` | Thêm vào giỏ hàng |
| 8 | `remove_from_cart` | `POST /internal/tools/remove_from_cart` | `sku: str` | Xóa mặt hàng khỏi giỏ |
| 9 | `preview_order` | `POST /internal/tools/preview_order` | `store_id: str, discount_code: Optional[str]` | Tính bảng tiền Decimal, cấp preview token 10m |
| 10 | `get_order_status` | `POST /internal/tools/get_order_status` | `order_no: str` | Tra cứu trạng thái đơn hàng & tiến độ giao |
| 11 | `cancel_simulated_order`| `POST /internal/tools/cancel_simulated_order`| `order_id: str, reason: str` | Hủy đơn hàng giả lập & hoàn trả tồn kho 1 lần |
| 12 | `create_support_ticket` | `POST /internal/tools/create_support_ticket`| `order_id: str, title: str, description: str` | Tạo ticket hỗ trợ khiếu nại |
| 13 | `manage_favorite` | `POST /internal/tools/manage_favorite` | `sku: str, action: Literal['add', 'remove']` | Quản lý danh mục laptop yêu thích |

> [!CAUTION]
> **ĐIỀU CẤM KỴ TỐI THƯỢNG (PRIME DIRECTIVE)**:  
> Tuyệt đối **không cấp công cụ `confirm_order` cho AI Agent**. Mọi thao tác chốt đơn phát sinh nghĩa vụ thanh toán và trừ tồn kho bắt buộc phải do chính người dùng con người bấm nút xác nhận trên giao diện Web UI (`SCR-08`).

---

## 5. QUY CHUẨN AN TOÀN & RÀNG BUỘC KỸ THUẬT BẮT BUỘC

1. **Khóa Bi Quan (Pessimistic Locking Concurrency Control)**:
   - Mọi thao tác trừ tồn kho và chốt đơn trong NestJS bắt buộc sử dụng khóa bi quan `setLock('pessimistic_write')` trong Database Transaction:
     ```typescript
     const stock = await queryRunner.manager.findOne(BranchStockEntity, {
       where: { storeId, variantId },
       lock: { mode: 'pessimistic_write' },
     });
     ```
2. **Bảo Vệ Chống Gửi Đúp (Idempotency Key Protocol)**:
   - Mọi endpoint tạo giao dịch (`/orders/checkout`) bắt buộc phải có header `Idempotency-Key`.
   - Nếu nhận cùng một `Idempotency-Key` trong vòng 24 giờ, hệ thống trả về ngay lập tức kết quả của lần xử lý đầu tiên mà không trừ tồn kho lần thứ hai.
3. **Triệt Tiêu Sai Số Làm Tròn Tiền Tệ (Zero-Float Guarantee)**:
   - CSDL: Kiểu dữ liệu bắt buộc `NUMERIC(18, 0)` cho giá tiền VNĐ.
   - Backend NestJS: Dùng thư viện `decimal.js` hoặc chuỗi `string`. Nghiêm cấm dùng kiểu số nguyên thủy `number` của JavaScript cho tiền tệ.
4. **Bảo Vệ Dữ Liệu Cá Nhân PII**:
   - Tự động nhận diện và làm sạch số CCCD (12 chữ số), Số điện thoại (10 chữ số), Email trước khi đưa vào prompt của LLM bên ngoài theo Nghị định 13/2023/NĐ-CP.
