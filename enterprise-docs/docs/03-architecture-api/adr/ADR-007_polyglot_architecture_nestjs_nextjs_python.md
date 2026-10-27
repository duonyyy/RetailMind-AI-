# ADR-007: Chuyển Đổi Stack Sang Kiến Trúc Polyglot (NestJS Backend + Next.js Frontend + Python AI Agent)

**Mã quyết định:** `ADR-007`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `APPROVED FOR BASELINE`  
**Ngày quyết định:** 2026-10-21  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** Change Request CR-001 (Yêu cầu tái cấu trúc Stack công nghệ tối ưu hóa theo thế mạnh ngôn ngữ)  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Trong bản thiết kế ban đầu (`ADR-006`), hệ thống chọn mô hình **Modular Monolith bằng Python (FastAPI)** cho toàn bộ Backend và **React 18 (Vite)** cho Frontend. Tuy nhiên, khi đánh giá khả năng vận hành thực tế tại môi trường doanh nghiệp bán lẻ quy mô lớn, kiến trúc thuần Python bộc lộ một số hạn chế:

1. **Frontend E-Commerce cần SEO mạnh mẽ:** Ứng dụng bán lẻ máy tính (Catalog, chi tiết sản phẩm) yêu cầu tối ưu hóa công cụ tìm kiếm (SEO) và thời gian tải trang ban đầu (First Contentful Paint - FCP) cực nhanh. React Vite SPA thuần client-side rendering (CSR) khó cạnh tranh SEO bằng **Next.js (Server-Side Rendering - SSR & Server Components)**.
2. **Backend Doanh Nghiệp Cần Cấu Trúc Hóa & Type-Safety:** **NestJS (TypeScript)** cung cấp kiến trúc Module hóa chuẩn mực, hệ thống Dependency Injection (DI) mạnh mẽ tương tự Spring Boot, hệ sinh thái ORM trưởng thành (TypeORM / Prisma) với khả năng quản lý Transaction ACID và kiểm soát khóa bi quan `SELECT ... FOR UPDATE` cực kỳ chặt chẽ.
3. **Phân Định Ranh Giới Chuyên Môn (Specialization):**
   - **Kỹ sư AI:** Tập trung 100% vào Python (LangGraph StateGraph, Pydantic v2, Hybrid RAG Qdrant, PII Sanitizer).
   - **Kỹ sư Web / Backend:** Tập trung vào NestJS API, RBAC Guards, Transaction chốt đơn và Next.js giao diện người dùng.

Vì vậy, hệ thống cần một quyết định kiến trúc chuyển đổi sang mô hình **Polyglot Tri-Tier Architecture**.

---

## 2. Bảng Phân Tích So Sánh Các Lựa Chọn

| Tiêu chí kỹ thuật | Lựa chọn A: Python Modular Monolith (FastAPI + React Vite) | Lựa chọn B: Polyglot Tri-Tier (Next.js + NestJS + Python Agent) |
|---|---|---|
| **Khả năng SEO E-Commerce** | **Kém (CSR):** Googlebot và các công cụ tìm kiếm gặp khó khăn khi index thông số laptop render qua client. | **Vượt trội (SSR/SSG):** Next.js App Router render sẵn HTML tại server, tối ưu Core Web Vitals và SEO danh mục máy tính. |
| **Kiến trúc Backend Doanh nghiệp** | FastAPI linh hoạt nhưng thiếu framework chuẩn cho DI, module lifecycle và enterprise decorators. | **NestJS chuẩn Enterprise:** Cung cấp sẵn Module, Controller, Provider, Middleware, Exception Filter, Interceptor chuẩn mực. |
| **Cô lập ranh giới an ninh Tác tử** | Agent nằm chung process với CSDL, rủi ro lập trình viên vô tình import chéo CSDL vào Agent. | **Cách ly vật lý tuyệt đối (Network Boundary):** Python Agent hoàn toàn không có connection string tới PostgreSQL, bắt buộc phải gọi qua NestJS Internal API. |
| **Độ trễ Tool Invocation** | Rất thấp (< 1ms do gọi in-process). | Tăng nhẹ (10–20ms do hop mạng HTTP/gRPC nội bộ giữa Agent và NestJS Backend trong mạng Docker Compose). |
| **Hệ sinh thái công cụ AI** | Độc quyền Python (LangGraph, PyTorch, HuggingFace, Qdrant SDK). | Giữ nguyên 100% sức mạnh Python cho Agent Service; không cần ép chuyển LangGraph sang TypeScript. |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: THỐNG NHẤT CHUYỂN ĐỔI SANG KIẾN TRÚC POLYGLOT TRI-TIER:**

1. **Frontend Tier — Next.js 16+ (App Router & TypeScript):**
   - Phụ trách giao diện Web Client (`UC01`, `UC02`, `UC04`, `UC05`, `UC07`, `UC11`, `UC12`).
   - Server Components cho Catalog, SSR cho Product Details, Client Components kết nối SSE Stream cho Chat AI Advisor (`UC03`).
2. **Backend Core Tier — NestJS 12+ (Node.js 20+ & TypeScript):**
   - **Chủ sở hữu nguồn chân lý duy nhất (SSOT Owner):** Quản lý kết nối PostgreSQL 16+ qua TypeORM.
   - Quản trị nghiệp vụ: Auth (JWT, Argon2id), Catalog, Khóa tồn kho (`SELECT ... FOR UPDATE`), Giỏ hàng, Đơn hàng snapshot, Idempotency và Support Tickets.
   - Cung cấp **Internal Tool API Gateway** (`/internal/tools/*`) được bảo vệ bởi khóa bí mật `X-Internal-Secret` để phục vụ riêng cho Python Agent gọi 13 Tools.
3. **AI Agent Tier — Python 3.11+ (FastAPI & LangGraph):**
   - Chạy độc lập như một Microservice chuyên biệt về suy luận AI và RAG.
   - Sử dụng LangGraph StateGraph điều phối vòng lặp ReAct (`MAX_STEPS = 5`).
   - Kết nối trực tiếp Qdrant Vector DB để truy xuất chính sách bảo hành.
   - Khi cần gọi các công cụ dữ liệu (`search_products`, `check_inventory`, `view_cart`), Agent gọi ngược về **Internal Tool API** của NestJS.
   - Phát luồng sự kiện SSE streaming về Next.js thông qua NestJS Gateway hoặc proxy trực tiếp.
4. **Quy chuẩn số học tiền tệ VNĐ trong NestJS:**
   - Bắt buộc lưu trữ cột `price_vnd` dưới dạng `NUMERIC(18, 0)` trong PostgreSQL.
   - Trong NestJS / TypeScript: **Nghiêm cấm dùng primitive `number` (float)**; bắt buộc dùng kiểu `string` hoặc thư viện `decimal.js` / `bignumber.js` để triệt tiêu hoàn toàn sai số làm tròn tiền tệ.

---

## 4. Sơ Đồ Kiến Trúc & Ranh Giới Giao Tiếp Liên Dịch Vụ

```mermaid
flowchart TB
    Client["Next.js 16+ Frontend<br/>(SSR • React 19 • TailwindCSS)"]
    
    subgraph EnterpriseCore ["Backend Doanh Nghiệp (NestJS 12+)"]
        NestGateway["API Gateway / REST Controllers<br/>(JWT Auth • RBAC • Inbound Security)"]
        BizServices["Business Services<br/>(Catalog • Inventory • Orders • Cart)"]
        InternalToolAPI["Internal Tool Execution Gateway<br/>(X-Internal-Secret Protected)"]
    end

    subgraph AgentRuntime ["AI Reasoning Runtime (Python 3.11+)"]
        FastAPIAgent["FastAPI SSE Proxy"]
        LangGraphEngine["LangGraph StateGraph Engine<br/>(Trần MAX_STEPS = 5 • ReAct Loop)"]
        PIIFilter["Inbound PII Redaction Filter"]
    end

    subgraph DataTier ["Tầng Lưu Trữ & Chỉ Mục"]
        PG[("PostgreSQL 16+ SSOT<br/>Khóa Bi Quan SELECT FOR UPDATE")]
        QD[("Qdrant Vector DB<br/>HNSW Cosine Vector Index")]
    end

    %% Tương tác
    Client ==>|1. HTTPS REST & Đăng nhập| NestGateway
    Client ==>|2. SSE Stream Chat AI| NestGateway
    NestGateway ==>|Proxy SSE Stream| FastAPIAgent
    
    FastAPIAgent --> PIIFilter
    PIIFilter --> LangGraphEngine
    LangGraphEngine ==>|3. Tra cứu Vector Chính Sách| QD
    LangGraphEngine ==>|4. Gọi 13 Typed Tools (REST)| InternalToolAPI
    InternalToolAPI --> BizServices
    BizServices ==>|5. ACID & Pessimistic Lock| PG
    
    NestGateway ==>|6. Nghiệp vụ chốt đơn & Catalog| BizServices
```

---

## 5. Hệ Quả & Kế Hoạch Kiểm Soát Rủi Ro (Consequences & Mitigations)

### Tích cực (Positive):
* Phát huy tối đa thế mạnh của từng công nghệ: SEO vượt trội với Next.js, cấu trúc nghiệp vụ vững chắc với NestJS, và AI tân tiến với Python.
* Tăng cường tính bảo mật: Python Agent bị cách ly hoàn toàn khỏi CSDL lõi PostgreSQL, triệt tiêu 100% nguy cơ Text-to-SQL hay lộ thông tin kết nối CSDL.
* Đáp ứng hoàn hảo mô hình phân bổ nhân sự thực tế trong các doanh nghiệp công nghệ.

### Thách thức & Biện pháp kiểm soát (Risks & Mitigations):
1. **Độ trễ cuộc gọi mạng nội bộ (Network Overhead):**
   * *Giải pháp:* Triển khai các container trong cùng Docker Bridge Network nội bộ (`127.0.0.1` / Docker internal DNS), sử dụng HTTP Keep-Alive và Connection Pooling, đảm bảo độ trễ mỗi lượt gọi tool $< 5\text{ms}$.
2. **Sai số số học trong JavaScript/TypeScript:**
   * *Giải pháp:* Cấu hình TypeORM transformer tự động ép kiểu `NUMERIC(18, 0)` sang `string` / `Decimal` object, viết bài kiểm thử Unit Test tiền tệ bắt buộc trong CI.
3. **Đồng bộ Schema DTO giữa NestJS và Python:**
   * *Giải pháp:* Sử dụng OpenAPI (Swagger) xuất từ NestJS để sinh mã Pydantic v2 Schema tự động hoặc duy trì hợp đồng JSON Schema dùng chung.
