# 02 — Backend Feature Specifications (Feature Slices Thay Cho Modules)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/05-backend/02-FEATURE_SPECIFICATIONS.md`  
**Căn cứ đặc tả**: `docs/database/01_conceptual_model.md`, `ADR-005` & `AGENTS.md`  
**Kiến trúc**: Feature-Driven Slices (`src/features/`) kết hợp Shared Kernel (`src/shared/`)  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Danh Mục Các Phân Hệ Tính Năng (Feature Slices)

Toàn bộ logic nghiệp vụ máy chủ được phân tách thành các **Features độc lập** (thay cho cách chia modules truyền thống), sử dụng chung hạ tầng tại `src/shared/`:

| STT | Tên Feature | Trách Nhiệm Nghiệp Vụ Chính | Các Bảng CSDL Trực Thuộc | Use Cases Phục Vụ |
|:---:|---|---|---|:---:|
| 1 | **auth/** | Quản lý danh tính, cấp JWT, Token Rotation, Argon2id, RBAC Guards | `users`, `roles`, `user_roles`, `refresh_tokens` | UC01, UC02 |
| 2 | **catalog/** | Danh mục Laptop, biến thể CPU/RAM/GPU, bộ lọc đa tiêu chí, so sánh máy | `categories`, `brands`, `products`, `product_variants`, `laptop_specifications` | UC04 |
| 3 | **inventory/** | Tồn kho chi nhánh, tính tồn khả dụng, khóa bi quan hàng tồn kho | `stores`, `inventory`, `inventory_reservations` | UC04, UC08 |
| 4 | **orders/** *(Commerce)* | Quản lý giỏ hàng, cấp Signed Preview Token, chốt đơn giả lập, hủy hoàn kho | `carts`, `cart_items`, `orders`, `order_items`, `idempotency_keys` | UC06, UC07, UC08, UC09 |
| 5 | **internal-agent/** | 13 REST Endpoints định kiểu an toàn phục vụ độc quyền cho Python Agent | *(Điều phối trung gian kết nối các features)* | UC03 |
| 6 | **customers/** | Quản lý hồ sơ người dùng, phân quyền truy cập dữ liệu cá nhân (chống IDOR) | `users`, `profiles` | UC01, UC02 |
| 7 | **knowledge/** | Tài liệu chính sách bảo hành, đổi trả, quản lý phiên bản bất biến băm SHA-256 | `policies`, `document_versions`, `policy_chunks_metadata` | UC05, UC10 |
| 8 | **support/** | Tạo và theo dõi phiếu khiếu nại, hỗ trợ kỹ thuật gắn liền với đơn hàng | `support_tickets`, `ticket_messages` | UC11, UC12 |
| 9 | **audit/** | Ghi nhận sổ cái kiểm toán bất biến (Append-Only) cho mọi thao tác trọng yếu | `audit_events`, `agent_execution_logs` | Toàn hệ thống |

---

## 2. Đặc Tả Chi Tiết Từng Feature Nghiệp Vụ

### 2.1. Feature `auth/` (Xác Thực & Phân Quyền)
* **Quy trình cấp token**:
  - `POST /api/v1/auth/login`: Xác thực email + mật khẩu bằng Argon2id. Nếu hợp lệ, cấp `access_token` (15 phút) và `refresh_token` (7 ngày).
  - Cả hai token được lưu trữ vào HttpOnly Cookie phía server để chống XSS.
* **Xoay vòng Refresh Token (Token Rotation)**:
  - Khi gọi `/api/v1/auth/refresh`, hủy refresh token cũ, cấp một cặp token mới.
  - Nếu phát hiện token cũ được gửi lại, hệ thống kích hoạt cơ chế báo động (Compromise Detection) và thu hồi toàn bộ các phiên hoạt động của người dùng.
* **Khóa tài khoản tức thời (Instant Revocation)**:
  - `JwtAuthGuard` trong `shared/guards` luôn kiểm tra cờ `users.is_active`. Nếu tài khoản bị Admin vô hiệu hóa, request bị từ chối ngay lập tức (`403 Forbidden`).

---

### 2.2. Feature `catalog/` (Danh Mục & Biến Thể Laptop)
* **Lọc đa tiêu chí tối ưu hóa B-Tree Index**:
  - Hỗ trợ tìm kiếm theo khoảng giá bán: `min_price`, `max_price`.
  - Hỗ trợ lọc theo thông số phần cứng: `ram_gb` (8GB, 16GB, 32GB), dung lượng ổ cứng, vi xử lý CPU (Intel Core Ultra, AMD Ryzen AI), card đồ họa (NVIDIA RTX).
* **So sánh đối đầu 2–4 biến thể (`GET /api/v1/products/compare`)**:
  - Trả về bảng thông số kỹ thuật song song (CPU, RAM, GPU, Màn hình, Khối lượng, Pin, Giá niêm yết SSOT).

---

### 2.3. Feature `inventory/` (Quản Lý Tồn Kho Chi Nhánh)
* **Công thức tính tồn kho khả dụng**:
  $$\text{Tồn khả dụng (Available Qty)} = \text{quantity} - \text{reserved\_quantity}$$
* **Cơ chế Khóa dòng bi quan (Pessimistic Locking)**:
  - Khi thực hiện kiểm tra hoặc chốt đơn, feature thực thi câu lệnh SQL có khóa độc quyền:
    ```sql
    SELECT * FROM inventory 
    WHERE variant_id = :variant_id AND store_id = :store_id 
    FOR UPDATE;
    ```
  - Triệt tiêu hoàn toàn rủi ro bán vượt tồn kho (Overselling) trong điều kiện hàng nghìn khách hàng cùng truy cập.

---

### 2.4. Feature `orders/` (Commerce & Vòng Đời Đơn Hàng)
* **Signed Preview Token (10 Phút)**:
  - Trước khi chốt đơn, người dùng phải tạo bản xem trước qua `POST /api/v1/orders/preview`.
  - Hệ thống sinh một token ký số HMAC-SHA256 chứa: `{ customer_id, store_id, items, total_amount_vnd, exp }`.
  - Token đóng vai trò là "Bản cam kết giá và số lượng" có hiệu lực đúng 10 phút (600 giây).
* **Chốt đơn giả lập nguyên tử (`POST /api/v1/orders/confirm`)**:
  1. Kiểm tra tính hợp lệ và thời hạn của Preview Token.
  2. Bắt đầu TypeORM QueryRunner Transaction CSDL.
  3. Khóa dòng tồn kho `SELECT ... FOR UPDATE` (sắp xếp ID tăng dần để chống Deadlock).
  4. Trừ tồn kho thực tế, tạo bản ghi `orders` (trạng thái `CONFIRMED`).
  5. Sao chép snapshot giá bán vào `order_items`.
  6. Xóa các mặt hàng tương ứng trong giỏ hàng.
  7. Commit Transaction và trả về đơn hàng đã tạo.
* **Hủy đơn hoàn kho 1 lần (`POST /api/v1/orders/{id}/cancel`)**:
  - Chỉ cho phép hủy khi đơn ở trạng thái `CONFIRMED`.
  - Cộng hoàn lại số lượng tồn kho đúng 1 lần duy nhất trong Transaction, cập nhật trạng thái đơn thành `CANCELLED`.

---

### 2.5. Feature `internal-agent/` (Cổng Kết Nối Tác Tử AI)
* Cung cấp 13 REST Endpoints chuẩn hóa phục vụ riêng cho Python AI Agent gọi thực thi:
  1. `/internal/tools/search_products`
  2. `/internal/tools/get_product_details`
  3. `/internal/tools/compare_products`
  4. `/internal/tools/check_inventory`
  5. `/internal/tools/search_policy`
  6. `/internal/tools/view_cart`
  7. `/internal/tools/add_to_cart`
  8. `/internal/tools/remove_from_cart`
  9. `/internal/tools/preview_order`
  10. `/internal/tools/get_order_status`
  11. `/internal/tools/cancel_simulated_order`
  12. `/internal/tools/create_support_ticket`
  13. `/internal/tools/manage_favorite`
* **Cấm Tuyệt Đối**: Không cung cấp endpoint `confirm_order` cho Tác tử AI. Khách hàng bắt buộc phải tự bấm nút xác nhận trên giao diện Web UI.

---

### 2.6. Phân Hệ `shared/` (Hạ Tầng & Tiện Ích Dùng Chung)
Toàn bộ các phân hệ nghiệp vụ trên đều kế thừa từ các thành phần dùng chung trong `src/shared/`:
* `shared/database/`: Quản lý DataSource TypeORM, connection pooling, migrations và seed data.
* `shared/guards/`: `JwtAuthGuard`, `RolesGuard`, `InternalSecretGuard`.
* `shared/decorators/`: `@Roles()`, `@CurrentUser()`, `@Public()`.
* `shared/filters/`: `HttpExceptionFilter`, `TypeOrmExceptionFilter`.
* `shared/interceptors/`: `TransformResponseInterceptor` (đóng gói Uniform API Envelope).
* `shared/utils/`: `SafeMath` (kiểm soát số học tiền tệ VNĐ `NUMERIC(18, 0)` bằng `decimal.js`).
