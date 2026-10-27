# 13 — Authentication, Authorization & Access Control Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/04-security-concurrency/13-AUTH_AND_ACCESS_CONTROL.md`  
**Căn cứ đặc tả**: `docs/requirements/permissions-matrix.md`, `docs/requirements/actors.md` & `AGENTS.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Cơ Chế Xác Thực Hệ Thống (Authentication Architecture)

Hệ thống áp dụng cơ chế xác thực **JWT Stateless Token** kết hợp **Refresh Token Rotation** và kiểm tra tài khoản tức thì:

1. **Chu Trình Cấp & Thu Hồi Token**:
   - Khi đăng nhập thành công (`POST /api/v1/auth/login`), hệ thống cấp cặp token:
     - `access_token`: JWT có hạn **15 phút**, chứa payload `{sub: user_id, role: role_name, email: email}`.
     - `refresh_token`: Chuỗi token ngẫu nhiên bảo mật cao có hạn **7 ngày**.
   - **Cách ly Token Phía Máy Chủ (Server-Side Token Isolation qua HttpOnly Cookie & BFF Proxy — ADR-009)**:
     - Toàn bộ Access Token và Refresh Token được lưu trong `Set-Cookie` với cờ `HttpOnly; Secure; SameSite=Strict`.
     - Trình duyệt phía Client không lưu token trong `localStorage`, vô hiệu hóa 100% nguy cơ rò rỉ token qua các lỗ hổng XSS.
     - Next.js Route Handler `/api/proxy/[...path]` đóng vai trò Reverse Proxy tự động trích xuất token và gắn Header `Authorization: Bearer <token>` khi chuyển tiếp vào mạng nội bộ NestJS Core hoặc Python Agent.
   - **Xoay vòng Refresh Token (Token Rotation)**: Mỗi lần gọi `/api/v1/auth/refresh`, refresh token cũ bị hủy ngay lập tức và cấp 1 refresh token mới. Nếu phát hiện token cũ được gửi lại, hệ thống nghi ngờ bị đánh cắp và lập tức thu hồi toàn bộ phiên của người dùng.
   - **Đăng xuất (`POST /api/v1/auth/logout`)**: Thu hồi refresh token ngay lập tức và xóa sạch HttpOnly Cookie.
2. **Cơ Chế Khóa Tài Khoản Tức Thì (Instant Account Revocation)**:
   - Backend Guards (`JwtAuthGuard` trong NestJS / `get_current_active_user` trong FastAPI) bắt buộc truy vấn cột `users.is_active` tại mỗi request. Nếu tài khoản bị Admin vô hiệu hóa (`is_active = false`), hệ thống lập tức từ chối với mã lỗi `403 Forbidden` (`ACCOUNT_INACTIVE`) ngay cả khi JWT token vẫn còn thời hạn hiệu lực.

---

## 2. Ma Trận Phân Quyền Theo Vai Trò (RBAC Matrix)

Hệ thống phân cấp 3 vai trò người dùng chuẩn mực (Scope Lock: Guest, Customer, Admin):

| Phân Hệ / Thực Thể | Thao Tác (Action) | Khách vãng lai (`Guest`) | Khách hàng (`Customer`) | Quản trị viên (`Admin`) | Cơ Chế Kiểm Soát Thực Thi |
|:--- |:--- |:---: |:---: |:---: |:--- |
| **Danh mục Laptop (`products`, `variants`)** | Xem, Lọc, So sánh | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép | Endpoint công khai (Public) |
| **Danh mục Laptop (`products`, `variants`)** | Tạo / Sửa / Xóa | ❌ Cấm | ❌ Cấm | ✅ Cho phép | NestJS `@Roles('ADMIN')` + `RolesGuard` |
| **Tồn kho chi nhánh (`inventory`)** | Tra cứu tồn khả dụng | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép | Endpoint công khai |
| **Tồn kho chi nhánh (`inventory`)** | Nhập / Xuất / Sửa kho | ❌ Cấm | ❌ Cấm | ✅ Cho phép | NestJS `@Roles('ADMIN')` + Ghi `audit_events` |
| **Chính sách RAG (`policies`)** | Tra cứu chính sách `public` | ✅ Cho phép | ✅ Cho phép | ✅ Cho phép | Qdrant Filter + PG `status = 'published'` |
| **Chính sách RAG (`policies`)** | Tải lên / Xuất bản | ❌ Cấm | ❌ Cấm | ✅ Cho phép | NestJS `@Roles('ADMIN')` + BullMQ Worker |
| **Giỏ hàng mua sắm (`carts`)** | Thêm, Sửa, Xóa giỏ | ❌ Cấm | ⚠️ Chỉ của mình | ❌ Cấm | **IDOR Check: `customer_id == user.id`** |
| **Đơn hàng giả lập (`orders`)** | Preview & Xác nhận chốt | ❌ Cấm | ⚠️ Chỉ của mình | ❌ Cấm | **IDOR Check + Khóa bi quan kho** |
| **Đơn hàng giả lập (`orders`)** | Xem chi tiết, Hủy đơn | ❌ Cấm | ⚠️ Chỉ của mình | ✅ Toàn quyền | **IDOR Check** (Customer) / Role Admin |
| **Hội thoại AI Agent (`conversations`)** | Chat tư vấn mua sắm | ❌ Cấm | ⚠️ Chỉ của mình | ❌ Cấm | **IDOR Check: `customer_id == user.id`** |
| **Phiếu khiếu nại (`support_tickets`)** | Tạo phiếu hỗ trợ | ❌ Cấm | ⚠️ Chỉ đơn của mình | ❌ Cấm | **IDOR Check: Kiểm tra quyền sở hữu đơn hàng** |
| **Sổ cái kiểm toán (`audit_events`)** | Xem nhật ký hệ thống | ❌ Cấm | ❌ Cấm | ✅ Cho phép | NestJS `@Roles('ADMIN')` (Chỉ đọc) |

---

## 3. Cơ Chế Phòng Chống Vượt Quyền Trực Tiếp Đối Tượng (IDOR Defense)

**IDOR (Insecure Direct Object References)** là rủi ro an ninh số 1 khi một khách hàng cố tình thay đổi `order_id` hoặc `conversation_id` để xem trộm hoặc hủy đơn hàng của người khác.

### Quy Tắc Phòng Thủ Bắt Buộc:
1. **Tuyệt đối không truy vấn tài nguyên chỉ bằng Primary Key**:
   * ❌ *Sai lầm:* `db.execute(select(Order).where(Order.id == order_id))`
   * ✅ *Bắt buộc:* `db.execute(select(Order).where(Order.id == order_id, Order.customer_id == current_user.id))`
2. **Xử lý khi vi phạm IDOR**: Khi truy vấn không tìm thấy bản ghi thuộc quyền sở hữu của `current_user.id`, hệ thống trả về mã lỗi `404 Not Found` (hoặc `403 Forbidden`) để không tiết lộ sự tồn tại của tài nguyên đó cho kẻ tấn công.
3. **Bảo vệ luồng Agentic Chat**: Mọi tool gọi truy xuất lịch sử hội thoại hoặc giỏ hàng bắt buộc lấy `customer_id` từ Token Context được giải mã bởi máy chủ, **tuyệt đối không nhận `customer_id` từ tham số do AI Agent tự truyền vào**.

---

## 4. Bảo Vệ Giao Diện Động (Dynamic UI Access Control Guard)

* **Next.js Middleware Guard**: Tự động kiểm tra session/token tại cạnh mạng (Edge/Server). Nếu user truy cập route `/admin/*` mà không có vai trò `ADMIN`, hệ thống điều hướng tức thì về `/unauthorized` hoặc trang đăng nhập.
* **Component-Level Access Control (`<CanAccess />`)**: Tương thích mô hình RBAC của Refine, tự động ẩn các nút thao tác nguy hiểm (nút điều chỉnh tồn kho, nút xóa sản phẩm) đối với vai trò `Customer` và `Guest`, bảo đảm giao diện phản ánh đúng quyền hạn thực tế.

