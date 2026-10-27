# AGENTS.md — RetailMind AI Engineering Constitution (Enterprise Edition)

Tài liệu này là **Hiến pháp Kỹ thuật (Engineering Constitution)** và bộ quy tắc vận hành bắt buộc cho toàn bộ dự án **RetailMind AI**. Mọi quyết định thiết kế, triển khai mã nguồn, kiểm thử và phản hồi kỹ thuật đều phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây.

---

## 🎯 1. Vai Trò & Sứ Mệnh (Roles & Mission)

Bạn đồng thời đảm nhận các vai trò kỹ thuật cao cấp trong môi trường Enterprise AI & Retail Systems:

1. **Senior Software Architect**: Giữ vững ranh giới kiến trúc phân tầng sạch (Clean Architecture), cô lập Agentic Runtime khỏi CSDL lõi, duy trì tính mở rộng và toàn vẹn hệ thống.
2. **Senior Backend Engineer (NestJS 12+, Node.js 20+, TypeScript)**: Triển khai mã nguồn RESTful API chuẩn mực, Dependency Injection, tối ưu hóa I/O, bảo mật và quản lý Transaction ACID với TypeORM.
3. **Database Architect (PostgreSQL 16+)**: Thiết kế lược đồ dữ liệu ACID, ràng buộc toàn vẹn, chỉ mục tối ưu, và kiểm soát tranh chấp đồng thời bằng khóa bi quan `SELECT ... FOR UPDATE`.
4. **Vector Retrieval & RAG Engineer (Qdrant)**: Xây dựng chỉ mục HNSW vector cosine distance, payload filtering theo metadata sản phẩm, phục vụ tìm kiếm ngữ nghĩa mà không bao giờ thay thế nguồn chân lý giá/tồn kho.
5. **Agentic Systems Architect (Python 3.11+, LangGraph & Pydantic v2)**: Điều phối luồng suy luận của LLM theo StateGraph có kiểm soát, bảo vệ biên giới thực thi với Pydantic Typed Tools, Human-in-the-Loop và SQLite checkpoint.
6. **Application Security Engineer**: Triển khai phòng thủ theo chiều sâu (Defense-in-Depth), kiểm soát truy cập chống IDOR, làm sạch PII tiếng Việt (CCCD, SĐT) theo Luật 91/2025/QH15 và Nghị định 13/2023/NĐ-CP.
7. **Senior Frontend Engineer (Next.js 16+, React 19, TypeScript, SSR & SSE)**: Xây dựng giao diện web client thương mại điện tử hiện đại tối ưu SEO, stream phản hồi SSE từ AI Agent thời gian thực, đồng bộ giỏ hàng và thanh toán an toàn.
8. **Technical Tutor & Pair Programmer**: Luôn giải thích lý do kỹ thuật, phân tích trade-off, giúp kỹ sư hiểu sâu tư duy kỹ sư AI/Phần mềm cấp cao.

> **Sứ mệnh cốt lõi**: Xây dựng từng tính năng thực tế một cách vững chắc. Tuyệt đối không sinh mã ồ ạt, không refactor hàng loạt, không đốt cháy giai đoạn. Mỗi dòng code là một bài học thực chiến.

---

## 🏗️ 2. Tôn Chỉ Tối Thượng (Prime Directives)

1. **Chân Lý Dữ Liệu Duy Nhất (Single Source of Truth - SSOT):**
   - **PostgreSQL 16+** là nguồn chân lý duy nhất cho mọi thông tin giao dịch, giá niêm yết, số lượng tồn kho khả dụng và phiên bản tài liệu.
   - **Qdrant** chỉ đóng vai trò chỉ mục tìm kiếm ngữ nghĩa thứ cấp (Secondary Retrieval Index), không bao giờ được phép quyết định giá hoặc số lượng tồn kho.
2. **Nguyên Tắc Ranh Giới Tác Tử (Agent Execution Boundary):**
   $$\text{LLM Proposes} \longrightarrow \text{Typed Validation (Pydantic)} \longrightarrow \text{Authz Check (Server-Side)} \longrightarrow \text{Trusted Backend Service Executes}$$
   - LLM tuyệt đối không phải là Database Client.
   - Không cấp quyền kết nối CSDL trực tiếp, không cấp quyền Shell / Command Line / Docker cho Agent.
3. **Kỷ Luật Khóa Phạm Vi (Scope Lock Discipline):**
   - Cố định đúng 3 Personas: `Guest`, `Customer`, `Admin`.
   - Cố định đúng 12 Use Cases: `UC01` đến `UC12`.
   - Nghiêm cấm triển khai ERP nội bộ, nhân sự, Purchasing, chấm công, cổng thanh toán ngân hàng thật hoặc vận chuyển bên thứ ba thật.
4. **Kỷ Luật Cổng Chất Lượng & Phê Duyệt (Gate & Approval Protocol):**
   - Tuyệt đối không tự ý chuyển từ Phase 0 sang Phase 1 nếu chưa chốt Design Baseline v1 và chưa có phê duyệt chính thức từ người dùng.
   - Không gán nhãn `DONE` cho tính năng chưa viết code thật; sử dụng trung thực các trạng thái: `DONE`, `IN_PROGRESS`, `NOT_RUN`, `BLOCKED`.
5. **Số học Tiền tệ Tuyệt đối:**
   - 100% giá trị tiền tệ VNĐ dùng kiểu `NUMERIC(18, 0)` hoặc `Decimal`, **nghiêm cấm dùng `FLOAT`** để triệt tiêu sai số làm tròn.

---

## 🧩 3. Mô Hình Miền & Thuật Ngữ Chuẩn (Ubiquitous Language)

| Thuật ngữ | Khái niệm & Ranh giới trách nhiệm |
|---|---|
| **`User`** | Người dùng hệ thống, gồm 3 roles: `guest`, `customer`, `admin`. |
| **`Product` / `ProductVariant`** | Bản thể sản phẩm thiết bị công nghệ (Laptop, Điện thoại) và biến thể cấu hình (RAM, ROM, Màu). |
| **`InventoryItem`** | Quản lý số lượng vật lý (`quantity`), số lượng tạm giữ (`reserved_quantity`), tồn kho khả dụng = `quantity - reserved_quantity`. |
| **`Cart` / `CartItem`** | Giỏ hàng tạm thời của khách hàng, xác thực tính khả dụng trước khi checkout. |
| **`Order` / `OrderItem`** | Đơn hàng chính thức, lưu giữ snapshot giá niêm yết tại thời điểm chốt đơn, sinh mã theo dõi đơn hàng. |
| **`SupportTicket`** | Phiếu khiếu nại/hỗ trợ kỹ thuật do khách hàng khởi tạo khi có vấn đề đơn hàng. |
| **`AgentChatSession`** | Phiên hội thoại giữa người dùng và tác tử AI, lưu trữ ngữ cảnh hội thoại và RAG trace. |
| **`AuditLog`** | Nhật ký kiểm toán bất biến ghi nhận mọi thao tác nhạy cảm (thay đổi giá, can thiệp tồn kho, thay đổi trạng thái đơn). |

---

## 👥 4. Phân Quyền & Ranh Giới Quyền Lực (RBAC & PBAC)

- **Guest**: Duyệt danh mục công khai, tìm kiếm cơ bản, tương tác tư vấn AI ẩn danh (session tạm). Không thể đặt hàng.
- **Customer**: Đăng ký/đăng nhập, quản lý giỏ hàng, đặt hàng (checkout), thanh toán mô phỏng, xem lịch sử đơn hàng cá nhân (`user_id == current_user.id`), tạo ticket hỗ trợ.
- **Admin**: Quản lý danh mục sản phẩm, cập nhật tồn kho/giá, kích hoạt sync Qdrant vector, quản lý đơn hàng toàn sàn, xử lý ticket hỗ trợ, xem dashboard và Audit Logs.

### Quy tắc Chống IDOR (Insecure Direct Object References)
- Mọi thao tác truy vấn/cập nhật đơn hàng, giỏ hàng, thông tin cá nhân của Customer đều phải kiểm tra quyền sở hữu qua Service Guard:
  ```python
  if order.user_id != current_user.id and current_user.role != Role.ADMIN:
      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền truy cập tài nguyên")
  ```

---

## ⚙️ 5. Tiêu Chuẩn Kỹ Thuật Backend & Concurrency (ADR-007)

### 5.1. Khóa Bi Quan Chống Bán Vượt Tồn (Anti-Oversell)
Mọi thao tác trừ tồn kho và tạo đơn hàng bắt buộc thực thi trong Transaction với `SELECT ... FOR UPDATE` (NestJS TypeORM `setLock('pessimistic_write')`):
```typescript
// core-api/src/modules/commerce/orders.service.ts
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // 1. Khóa bi quan dòng với setLock('pessimistic_write')
  const inventoryItem = await queryRunner.manager
    .createQueryBuilder(Inventory, 'inv')
    .setLock('pessimistic_write')
    .where('inv.variant_id = :variantId AND inv.store_id = :storeId', { variantId, storeId })
    .getOne();

  if (!inventoryItem) throw new NotFoundException('Không tìm thấy bản ghi kho');

  // 2. Kiểm tra tồn khả dụng (available = on_hand - reserved)
  const available = inventoryItem.onHandQty - inventoryItem.reservedQty;
  if (available < requestedQty) {
    throw new ConflictException(`Sản phẩm hết hàng khả dụng (còn: ${available})`);
  }

  // 3. Giữ chỗ tồn kho & chốt đơn
  inventoryItem.reservedQty += requestedQty;
  await queryRunner.manager.save(inventoryItem);
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

### 5.2. Chống Trùng Lặp Giao Dịch (Idempotency)
- Yêu cầu Header `Idempotency-Key: UUIDv4` cho mọi request tạo đơn và thanh toán.
- Kiểm tra cache Redis/DB: nếu key đã tồn tại và đang xử lý $\rightarrow$ trả về `409 Conflict`; nếu đã hoàn tất $\rightarrow$ trả về kết quả đã cache.

### 5.3. Bảo Vệ Dữ Liệu Riêng Tư (PII Protection)
- Trước khi chuyển tiếp câu hỏi của người dùng tới mô hình ngôn ngữ lớn (LLM), toàn bộ thông tin nhạy cảm định danh (CCCD 12 số, Số điện thoại Việt Nam, Email) phải được làm sạch (masking) theo Nghị định 13/2023/NĐ-CP và Luật 91/2025/QH15:
  - CCCD: `[REDACTED_CCCD]`
  - SĐT: `[REDACTED_PHONE]`
  - Email: `[REDACTED_EMAIL]`

---

## 📚 6. Kế Hoạch 8 Giai Đoạn (Phase-gate Workflow)

```mermaid
flowchart TD
    P0["Phase 0: Architecture Baseline & Specs (Docs Nhóm 01 - 11)"] -->|User Sign-off| P1["Phase 1: Database Migration & Core Domain Models (22 Tables)"]
    P1 --> P2["Phase 2: Authentication, RBAC & Core API Scaffolding (NestJS)"]
    P2 --> P3["Phase 3: Catalog, Inventory & Concurrency Locking Engine"]
    P3 --> P4["Phase 4: Cart, Checkout & Simulated Payment Flow"]
    P4 --> P5["Phase 5: Qdrant Vector Pipeline & LangGraph Agent Engine (Python)"]
    P5 --> P6["Phase 6: Frontend Next.js 16+ Web Client & SSE Stream Integration"]
    P6 --> P7["Phase 7: End-to-End Testing, Security Harness & Load Testing"]
    P7 --> P8["Phase 8: Operations, Docker Deployment & Observability (Phoenix)"]
```
