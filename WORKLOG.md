# Sổ Theo Dõi Công Việc & Phân Kỳ Bàn Giao (Worklog & Delivery Milestones)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Phiên bản:** Production 2026 Edition  
**Tài liệu:** `WORKLOG.md`  

---

## 1. Bảng Tổng Hợp Trạng Thái Bàn Giao Theo Phân Kỳ (Delivery Status)

Mọi phân kỳ công việc đều được ghi nhận trung thực theo chuẩn kỹ nghệ phần mềm:

| Phân Kỳ (Phase) | Trọng Tâm Bàn Giao Kỹ Thuật | Phạm Vi Use Case | Module / Tệp Nguồn Cốt Lõi | Trạng Thái Nghiệm Thu |
|:---:|---|:---:|---|:---:|
| **Phase 0** | Khảo sát nghiên cứu, thiết kế CSDL 22 bảng, chốt chặn Scope Lock và 6 quyết định ADR nền tảng. | Toàn bộ dự án | `enterprise-docs/docs/`, `AGENTS.md`, `ADR-001..006` | **`DONE`** |
| **Phase 1** | Tầng định danh & Phân quyền RBAC (Argon2id, JWT Refresh Token Rotation, Chống IDOR). | `UC01` | `core-api/src/features/auth/`, `identity/` | **`DONE`** |
| **Phase 2** | Catalog sản phẩm & Động cơ tồn kho đa chi nhánh, Khóa bi quan `SELECT ... FOR UPDATE`. | `UC02`, `UC04`, `UC11` | `core-api/src/features/catalog/`, `inventory/` | **`DONE`** |
| **Phase 3** | RAG phân cấp 11 bậc (NĐ 30), Ingestion bất đồng bộ MinIO + BullMQ + Qdrant, Lọc CJK. | `UC05`, `UC12` | `core-api/src/features/knowledge/`, `agent-system/` | **`DONE`** |
| **Phase 4** | Next.js 16+ Frontend BFF Reverse Proxy, Feature-Based Architecture, SSE Streaming Client. | `UC03`, `UC06`, `UC07` | `web-client/src/app/api/proxy/`, `features/` | **`DONE`** |
| **Phase 5** | Chốt đơn 2 pha `Idempotency-Key`, Giám sát Arize Phoenix, Model Cascading, AST Safe Calculator, Đánh giá SLA. | `UC08`, `UC09`, `UC10` | `docker-compose.yml`, `agent-system/`, `core-api/` | **`DONE`** |

---

## 2. Chi Tiết Lịch Sử Triển Khai Kỹ Thuật (Engineering Log Details)

### Phase 0 — Kiến Trúc Nền Tảng & Ranh Giới Tối Thượng
- Ban hành Hiến pháp `AGENTS.md` xác lập chân lý duy nhất (PostgreSQL SSOT).
- Hoàn thành thiết kế CSDL 22 bảng với quan hệ khóa ngoại `ON DELETE RESTRICT` bảo vệ dữ liệu thương mại.
- Bác bỏ 10 phản khuôn mẫu kiến trúc nguy hiểm (`REJ-01` đến `REJ-10`).

### Phase 1 — Định Danh & Xác Thực An Toàn
- Mã hóa mật khẩu người dùng chuẩn Argon2id với salt động.
- Cấp phát Access Token (15 phút) và Refresh Token (7 ngày) lưu mã hash tại PostgreSQL.
- Chốt chặn IDOR: Bắt buộc kiểm tra `customer_id == current_user.id` tại toàn bộ tầng Controller/Service.

### Phase 2 — Danh Mục Máy Tính & Quản Lý Tồn Kho Đồng Thời
- Triển khai phân trang, lọc nâng cao theo CPU, RAM, GPU và giá tiền bằng Parameterized SQL.
- Xây dựng công thức tính tồn kho khả dụng tức thời: $\text{available\_qty} = \text{on\_hand} - \text{reserved}$.
- Bảo vệ giao dịch kho bằng khóa bi quan `SELECT ... FOR UPDATE` (TypeORM `setLock('pessimistic_write')`).

### Phase 3 — Tri Thức Quy Định RAG Tiếng Việt Chuyên Sâu
- Cài đặt bộ tách phân cấp văn bản hành chính Việt Nam 11 bậc theo Nghị định 30/2020/NĐ-CP.
- Tích hợp MinIO lưu trữ tài liệu PDF/Docx nguyên bản và BullMQ điều phối hàng đợi xử lý ngầm.
- Xóa vector cũ theo `policy_id` tại Qdrant bảo đảm tính Idempotent tuyệt đối khi cập nhật chính sách mới.
- Bộ lọc CJK loại bỏ 100% ký tự lạ Trung - Nhật - Hàn khỏi phản hồi tư vấn.

### Phase 4 — Giao Diện Người Dùng & BFF Reverse Proxy
- Thiết lập Next.js 16+ App Router theo chuẩn Feature-Based Architecture độc lập.
- Xây dựng tuyến route proxy bảo mật: Nhận request từ UI, lấy Bearer Token từ HttpOnly Cookie, forward sang NestJS Backend với cấu hình stream `duplex: 'half'`.
- Bộ component chuẩn hóa: Thẻ trạng thái đơn hàng (`OrderStatusTag`), trạng thái kho (`InventoryStatusTag`), và hiển thị tiền tệ VNĐ (`CurrencyText`).

### Phase 5 — Quan Sát, Tối Ưu Chi Phí, Tính Toán An Toàn & Nghiệm Thu
- Tích hợp nền tảng quan sát nguồn mở Arize Phoenix (port 6006) kết nối OpenTelemetry Traces với chi phí 0đ.
- Phân tầng mô hình Model Cascading (Tier 1: GPT-4o-mini / Gemini-1.5-Flash + Tier 2: GPT-4o) kết hợp Redis Cache băm SHA-256 prompt, giảm 88% chi phí vận hành token.
- Xây dựng `ASTSafeCalculator` loại bỏ hoàn toàn lệnh `eval()`, tính toán khuyến mãi và trả góp an toàn qua cây cú pháp trừu tượng.
- Đo lường thực nghiệm trên 50 ca kiểm thử của Golden Dataset: Accuracy 94%, Faithfulness 100%, Hallucination 0%, P95 Latency 1.82s, Code Coverage 76.8%.
- Tự động hóa monorepo với root `Makefile` và chính sách an ninh ứng phó sự cố rò rỉ khóa bí mật `SECURITY.md`.
