# ⚙️ Nhóm 05 — Dịch Vụ Máy Chủ NestJS (NestJS Core Backend & SSOT)

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/05-backend/README.md`  
**Công nghệ chính**: NestJS 12+, Node.js 20+ LTS, TypeScript Strict, TypeORM 0.3+, PostgreSQL 16+  
**Kiến trúc tổ chức**: **`shared/`** (Shared Kernel dùng chung) & **`features/`** (Feature-Driven Slices thay cho modules)  
**Vai trò kỹ thuật**: Enterprise Backend Architect / Lead Node.js Engineer  
**Căn cứ đặc tả**: `AGENTS.md`, `ADR-005`, `ADR-007`, `ADR-008`, `ADR-009`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Tầm Nhìn Kiến Trúc NestJS Backend Core

Backend của **RetailMind AI** được xây dựng duy nhất bằng nền tảng **NestJS 12+ (TypeScript)**, đóng vai trò là **Nguồn Chân Lý Duy Nhất (Single Source of Truth - SSOT)** cho toàn bộ hệ thống bán lẻ:

1. **Chủ Sở Hữu Chân Lý Dữ Liệu (SSOT Owner):**
   - Quản trị trực tiếp kết nối tới **PostgreSQL 16+** qua TypeORM.
   - Nắm giữ toàn bộ dữ liệu giao dịch: Giá bán niêm yết, số lượng tồn kho chi nhánh, phiên bản tài liệu bảo hành, giỏ hàng và đơn hàng.
   - Tuyệt đối không cho phép AI Agent hay Qdrant Vector DB tự ý quyết định giá hoặc số lượng tồn kho.
2. **Kiến Trúc Feature-Driven & Shared Kernel Hiện Đại:**
   - **`shared/` (Hạ tầng & Tiện ích dùng chung):** Tập trung toàn bộ Database Connection, TypeORM Migrations/Seeds, Custom Decorators (`@Roles()`), Guards (`JwtAuthGuard`, `InternalSecretGuard`), Exception Filters, Logging Interceptors và SafeMath tiền tệ VNĐ.
   - **`features/` (Phân hệ nghiệp vụ độc lập thay cho modules):** Tổ chức mã nguồn theo từng Feature lát cắt nghiệp vụ (Auth, Catalog, Inventory, Orders/Commerce, Internal Agent, Customers). Mỗi feature đóng gói Controller, Service, Entities và DTOs riêng biệt.
3. **Cổng Kết Nối Tác Tử An Toàn (Internal Tool Execution Gateway):**
   - Cung cấp 16 Endpoints nội bộ (`/api/v1/internal/tools/*`) được bảo vệ bằng khóa bí mật `X-Internal-Secret` để phục vụ riêng cho Python AI Agent gọi thực thi.
   - AI Agent chỉ được đề xuất tham số (Tool Calls); NestJS Backend đóng vai trò người gác cổng kiểm tra quyền hạn (Authz) và thực thi an toàn.

---

## 2. Bản Đồ Danh Mục Tài Liệu Thuộc Nhóm 05

| Thứ tự | Tên tài liệu | Mục đích kỹ thuật cốt lõi |
| :---: | :--- | :--- |
| **01** | [`01-BACKEND_ARCHITECTURE.md`](01-BACKEND_ARCHITECTURE.md) | Kiến trúc tổng thể NestJS Core: Cấu trúc thư mục Feature-Driven (`shared/` và `features/`), phân tầng Clean Onion Architecture, vòng đời Request/Response và quy chuẩn Error Envelope. |
| **02** | [`02-FEATURE_SPECIFICATIONS.md`](02-FEATURE_SPECIFICATIONS.md) | Đặc tả chi tiết các Features nghiệp vụ cốt lõi: AuthFeature, CatalogFeature, InventoryFeature, OrdersFeature, InternalAgentFeature và CustomersFeature. |
| **03** | [`03-TRANSACTION_AND_CONCURRENCY.md`](03-TRANSACTION_AND_CONCURRENCY.md) | Kỹ thuật kiểm soát giao dịch TypeORM, khóa bi quan dòng `SELECT ... FOR UPDATE`, sắp xếp ID chống Deadlock, Preview Token 10 phút, Idempotency-Key và chuẩn số học tiền tệ `NUMERIC(18, 0)`. |
| **04** | [`04-INTERNAL_TOOL_GATEWAY.md`](04-INTERNAL_TOOL_GATEWAY.md) | Hợp đồng giao thức kết nối nội bộ giữa NestJS Backend và Python AI Agent: Header bí mật `X-Internal-Secret`, ranh giới an toàn Zero-Trust và xác thực quyền hạn Server-Side. |
| **05** | [`05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md`](05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md) | Pipeline xử lý ngầm bất đồng bộ: MinIO S3 Object Storage (băm SHA-256), Redis Cache & Broker, BullMQ Ingestion Worker (phân đoạn 11 bậc NĐ 30/2020/NĐ-CP và nạp vector idempotent). |
| **06** | [`06-ENTERPRISE_BEST_PRACTICES_FOODEE.md`](06-ENTERPRISE_BEST_PRACTICES_FOODEE.md) | 10 Tinh hoa kỹ thuật Enterprise từ `foodee-be/core-api`: Ranh giới `public-api.ts` & ESLint boundaries, Headless Worker (`createApplicationContext`), Transactional Outbox, phòng thủ Anti-Enumeration (404), Magic Bytes buffer upload và đối soát tự hàn gắn (Reconciliation Cron). |
| **07** | [`07-BACKEND_IMPLEMENTATION_PLAN.md`](07-BACKEND_IMPLEMENTATION_PLAN.md) | Kế hoạch triển khai chi tiết 6 Sprints đưa `core-api/` từ 50% lên 100% SSOT. Kế hoạch thực thi 6 phase chi tiết hiện tại xem tại [`core-api/docs/CORE_API_IMPLEMENTATION_PLAN.md`](../../../core-api/docs/CORE_API_IMPLEMENTATION_PLAN.md). |
 
---

## 3. Sơ Đồ Kiến Trúc NestJS Backend Trong Hệ Thống Tổng Thể

```mermaid
flowchart TB
    %% ==========================================
    %% COLOR PALETTE & STYLES
    %% ==========================================
    classDef clientStyle fill:#0F172A,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC,rx:8,ry:8
    classDef sharedStyle fill:#1E293B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7,rx:8,ry:8
    classDef featureStyle fill:#0F172A,stroke:#EA284E,stroke-width:2.5px,color:#FFE4E6,rx:8,ry:8
    classDef agentStyle fill:#1E1B4B,stroke:#38BDF8,stroke-width:2px,color:#F3E8FF,rx:8,ry:8
    classDef dbStyle fill:#1F1329,stroke:#EC4899,stroke-width:2px,color:#FCE7F3,rx:8,ry:8

    %% ==========================================
    %% CLIENT & BFF
    %% ==========================================
    Client["Next.js 16+ Frontend Client<br/>(BFF Reverse Proxy /api/proxy/* • HttpOnly Cookie)"]:::clientStyle

    %% ==========================================
    %% NESTJS BACKEND CORE
    %% ==========================================
    subgraph NestCore ["🏛️ NESTJS 12+ BACKEND CORE (PORT 4000 — SSOT OWNER)"]
        direction TB

        subgraph SharedKernel ["📁 shared/ (HẠ TẦNG & TIỆN ÍCH DÙNG CHUNG)"]
            SharedDB["database/ (TypeORM DataSource • Migrations • Seeds)"]:::sharedStyle
            SharedGuards["guards/ (JwtAuthGuard • RolesGuard • InternalSecretGuard)"]:::sharedStyle
            SharedDecorators["decorators/ (@Roles • @CurrentUser • @Public)"]:::sharedStyle
            SharedFilters["filters/ & interceptors/ (TransformResponse • HttpException)"]:::sharedStyle
        end

        subgraph FeaturesLayer ["📁 features/ (CÁC PHÂN HỆ NGHIỆP VỤ THAY CHO MODULES)"]
            AuthFeat["auth/ (JWT Auth • Argon2id • Token Rotation)"]:::featureStyle
            CatFeat["catalog/ (Laptop Specs • Filters • Compare)"]:::featureStyle
            InvFeat["inventory/ (Pessimistic Lock FOR UPDATE)"]:::featureStyle
            OrderFeat["orders/ (Cart • Preview Token • Confirm)"]:::featureStyle
            AgentFeat["internal-agent/ (/internal/tools/* Gateway)"]:::featureStyle
        end

        FeaturesLayer -.->|Import & Kế thừa| SharedKernel
    end

    %% ==========================================
    %% SUPPORTING AGENT & STORAGE
    %% ==========================================
    AgentEngine["Python 3.11+ AI Agent Service (Port 8000)<br/>• LangGraph StateGraph (5 Steps)<br/>• Output Guard Fact-Checker & CJK Filter"]:::agentStyle
    PG[("PostgreSQL 16+ SSOT<br/>22 Bảng • Numeric VNĐ • Khóa bi quan")]:::dbStyle

    %% ==========================================
    %% CONNECTIONS
    %% ==========================================
    Client ==>|1. REST API /api/v1/* (HttpOnly Bearer)| FeaturesLayer
    Client ==>|2. SSE Streaming Chat AI| AgentEngine

    SharedDB ==>|3. TypeORM ACID Transaction & FOR UPDATE| PG

    AgentEngine ==>|4. Gọi 13 Typed Tools qua REST (/internal/tools/*)| AgentFeat
    AgentFeat --> CatFeat
    AgentFeat --> InvFeat
    AgentFeat --> OrderFeat
```
