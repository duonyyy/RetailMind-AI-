# Sổ Cái Quyết Định Thiết Kế (Architectural & Scope Decisions Log)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/progress/DECISIONS.md`  
**Giai đoạn:** Phase 0 (Requirements & Feasibility Baseline)  
**Trạng thái:** ACTIVE LOG  

---

## 1. Nhật Ký Các Quyết Định Đã Chốt Tại Section 01

| Mã Quyết Định | Ngày quyết định | Vấn đề & Quyết định chính thức | Phạm vi ảnh hưởng | Trạng thái |
|:---:|:---:|---|---|:---:|
| **DEC-01-01** | 2026-10-20 | **Khóa chặt phạm vi 3 Personas:** Chỉ có `Guest`, `Customer` và `Admin`. Không phát triển các vai trò `Staff`, `Manager` hay phân hệ ERP/Ops AI. | `01_PRODUCT_VISION_AND_SCOPE.md`<br/>`actors.md` | **LOCKED** |
| **DEC-01-02** | 2026-10-20 | **Cố định danh mục ca sử dụng:** Giữ nguyên 12 mã Use Case bất biến từ `UC01` đến `UC12`. | `use-case-catalog.md`<br/>`use-case-diagram.md` | **LOCKED** |
| **DEC-01-03** | 2026-10-20 | **Phong cách kiến trúc Modular Monolith (Phiên bản đầu):** 1 FastAPI Backend + 1 React Frontend + PostgreSQL + Qdrant trong một Docker Compose đơn lẻ. *(Đã nâng cấp theo DEC-01-23 / ADR-007)* | `integration-decisions.md` | **SUPERSEDED** |
| **DEC-01-04** | 2026-10-20 | **Bác bỏ triệt để Text-to-SQL:** Cấm LLM tự sinh câu truy vấn SQL; thay bằng 100% Typed Tools với Pydantic và Parameterized SQL. | `agent-tool-flow.md`<br/>`rejected-patterns.md` | **LOCKED** |
| **DEC-01-05** | 2026-10-20 | **Chính sách phân quyền AI Chat:** Tính năng trò chuyện AI chỉ dành cho `Customer` đã đăng nhập; `Guest` chỉ dùng bộ lọc tìm kiếm công khai. | `actors.md`<br/>`integration-decisions.md` | **LOCKED** |
| **DEC-01-06** | 2026-10-20 | **Quy trình chốt đơn 2 pha (Two-Phase Commit):** AI chỉ sinh Preview Token ngắn hạn (10m); người dùng bắt buộc nhấn nút Confirm trên Web để chốt đơn. | `commerce-flow.md` | **LOCKED** |
| **DEC-01-07** | **PostgreSQL là Nguồn Chân Lý Duy Nhất:** Toàn bộ giá bán, tồn kho, đơn hàng và metadata tài liệu quản lý tại PostgreSQL; Qdrant chỉ là chỉ mục phụ trợ. | `rag-flow.md`<br/>`evidence-matrix.md` | **LOCKED** |
| **DEC-01-08** | 2026-10-20 | **Bảo vệ PII tiếng Việt đa tầng:** Áp dụng mã hóa giả danh đảo ngược được (Reversible Pseudonymization) tuân thủ Nghị định 13 và Luật 91/2025/QH15. | `security-reliability.md` | **LOCKED** |
| **DEC-01-09** | 2026-10-20 | **Cấm tuyệt đối Shell/Docker Tool:** Không nhúng bất kỳ công cụ thực thi mã lệnh hoặc Docker API nào vào Agent của khách hàng. | `rejected-patterns.md` | **LOCKED** |
| **DEC-01-10** | 2026-10-20 | **Kiểm thử tự động bằng Mock Provider:** Cung cấp sẵn kịch bản mock cho toàn bộ 12 Use Cases, đảm bảo chạy test E2E hoàn toàn offline với chi phí $0.00. | `evaluation.md` | **LOCKED** |
| **DEC-01-11** | 2026-10-20 | **Khóa Đặc Tả Chi Tiết 12 Ca Sử Dụng:** Chuẩn hóa hợp đồng 15 thuộc tính từ UC01 đến UC12, định danh mã lỗi và Acceptance Tests cụ thể. | `use-case-specifications.md` | **LOCKED** |
| **DEC-01-12** | 2026-10-20 | **Khóa Ma Trận Phân Quyền RBAC & IDOR:** Ràng buộc kiểm tra quyền sở hữu cấp dòng trên toàn bộ 22 bảng CSDL và 13 Agent Tools. | `permissions-matrix.md` | **LOCKED** |
| **DEC-01-13** | 2026-10-20 | **Khóa Danh Mục 25 Quy Tắc Nghiệp Vụ (BR-001–BR-025):** Thiết lập kiến trúc phòng thủ 5 tầng, nghiêm cấm FLOAT cho VNĐ, khóa bi quan CSDL. | `business-rules.md` | **LOCKED** |
| **DEC-01-14** | 2026-10-20 | **Mô Hình Hóa Feedback Trong support_tickets:** Thống nhất không tạo bảng riêng cho feedback, dùng `kind = 'FEEDBACK'` để giữ trọn vẹn 22 bảng CSDL. | `use-case-specifications.md`<br/>`business-rules.md` | **LOCKED** |
| **DEC-01-15** | 2026-10-20 | **Đóng Băng Lược Đồ Vật Lý 22 Bảng CSDL:** Chuẩn PostgreSQL 16+, toàn bộ cột tiền tệ dùng `NUMERIC(18, 0)` VNĐ, khóa ngoại `ON DELETE RESTRICT`, trigger tự động cập nhật `updated_at`. | `docs/database/01..07.md` | **LOCKED** |
| **DEC-01-16** | 2026-10-20 | **Chuẩn Hóa Composite Primary Key:** Áp dụng Composite PK cho `inventory(variant_id, store_id)` và `favorites(customer_id, variant_id)` nhằm tối ưu lưu trữ và đảm bảo tính duy nhất tự nhiên. | `02_logical_schema.md`<br/>`03_physical_schema.md` | **LOCKED** |
| **DEC-01-17** | 2026-10-20 | **Khóa Dòng Bi Quan & Sắp Xếp Chống Deadlock:** Áp dụng `SELECT ... FOR UPDATE` sắp xếp ID tăng dần khi chốt đơn; Partial Unique Indexes cho giỏ hàng active và policy published. | `06_constraints_indexes.md` | **LOCKED** |
| **DEC-01-18** | 2026-10-20 | **Lộ Trình Di Trú 5 Phân Kỳ & Seed Tất Định:** Phân bổ 22 bảng tuần tự qua migration scripts từ P1 đến P5; kịch bản seed sử dụng UUID cố định và `ON CONFLICT DO NOTHING`. | `07_migration_plan.md` | **LOCKED** |
| **DEC-01-19** | 2026-10-20 | **Khóa Ma Trận Truy Vết Toàn Diện 10 Cột:** Đảm bảo 0 Use Case mồ côi và 0 Bảng CSDL vô chủ (`UC01–UC12 -> API -> Service -> 22 Bảng -> Tool -> Tests`). | `traceability-matrix.md` | **LOCKED** |
| **DEC-01-20** | 2026-10-20 | **Chuẩn Hóa Kiến Trúc Modular Monolith & Mô Hình C4 (Phiên bản đầu):** Phân lập 8 Bounded Contexts trong 1 ứng dụng backend, giao tiếp In-Memory Service. *(Đã nâng cấp sang NestJS SSOT + Python Agent theo DEC-01-23)* | `01_system_architecture.md` | **SUPERSEDED** |
| **DEC-01-21** | 2026-10-20 | **Khóa 6 Quyết Định Kiến Trúc Cốt Lõi (ADR-001..006):** Qdrant vs pgvector, Internal tools vs MCP, Single Agent vs Multi-Agent, Parameterized SQL vs Text-to-SQL, Order Lifecycle, Modular Monolith. | `docs/architecture/adr/*` | **LOCKED** |
| **DEC-01-22** | 2026-10-20 | **Khóa Mô Hình Đe Dọa STRIDE & Bộ Lọc PII Tiếng Việt:** Bảo vệ Zero-Trust, lọc CCCD, SĐT, Email theo Nghị định 13/2023/NĐ-CP và Luật 91/2025/QH15 trước khi ra Cloud LLM. | `03_security_threat_model.md` | **LOCKED** |
| **DEC-01-23** | 2026-10-21 | **Chuyển Đổi Stack Polyglot (Next.js + NestJS + Python Agent):** Phê duyệt theo ADR-007; Frontend Next.js 16+ (SSR), Backend NestJS 12+ (TypeORM SSOT), AI Agent Python 3.11+ (LangGraph StateGraph). | `ADR-007`<br/>`AGENTS.md` | **APPROVED** |
| **DEC-01-24** | 2026-10-23 | **RAG Phân Cấp Tiếng Việt (NĐ 30), Ingestion Idempotent & Citation Whitelist:** Phân mảnh 11 bậc thể thức văn bản hành chính Việt Nam, xóa vector cũ theo policy_id trước khi upsert, Regex khử trùng ảo giác CJK và đối chiếu Citation Whitelist tại Output Guard. | `ADR-008`<br/>`04-RAG_FLOW.md` | **APPROVED** |
| **DEC-01-25** | 2026-10-23 | **Frontend BFF Reverse Proxy, Feature-Based Architecture & Dynamic RBAC:** Route Handler `/api/proxy/[...path]` che giấu Bearer Token trong HttpOnly Cookie, SSE streaming với `duplex: 'half'`, phân tách Queries `.get.ts` và Server Actions `.action.ts`, Dynamic UI RBAC Matrix. | `ADR-009`<br/>`17-FRONTEND_DESIGN.md` | **APPROVED** |
| **DEC-01-26** | 2026-10-23 | **FinOps Model Cascading & Self-Hosted Arize Phoenix:** Phân tầng mô hình 2 lớp kết hợp Redis SHA-256 prompt cache tiết kiệm 88% token cost; giám sát OTel Traces & UMAP embedding drift bằng container Phoenix mã nguồn mở (cổng 6006) chi phí 0đ. | `18-OBSERVABILITY.md`<br/>`20-PERFORMANCE_PLAN.md` | **APPROVED** |
| **DEC-01-27** | 2026-10-23 | **Khung Đánh Giá Định Lượng SLA & AST Safe Calculator:** 50 ca kiểm thử Golden Dataset (Accuracy $\ge 85\%$, Latency $\le 2.5\text{s}$, Faithfulness $100\%$, Hallucination $0\%$, Coverage $\ge 70\%$); công cụ tính toán an toàn ASTSafeCalculator triệt tiêu hoàn toàn lệnh `eval()`. | `19-TEST_STRATEGY.md`<br/>`07-EVALUATION_BENCHMARK.md` | **APPROVED** |

