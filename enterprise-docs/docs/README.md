# 📚 RetailMind AI — Tài Liệu Kiến Trúc & Thiết Kế Hệ Thống Doanh Nghiệp

> **Single Source of Truth** cho toàn bộ quá trình phân tích bài toán, thiết kế kiến trúc, hợp đồng API, mô hình an ninh, bằng chứng thực nghiệm và lộ trình thi công của hệ thống **RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform**.

---

## 🗂️ 1. Cấu Trúc Thư Mục Phân Định Theo Vai Trò Kỹ Thuật

Tất cả tài liệu được phân chia thành **11 thư mục chức năng**, mỗi thư mục đại diện cho một vai trò kỹ thuật độc lập trong chu trình phát triển phần mềm:

```text
enterprise-docs/docs/
├── README.md                           # Tệp điều hướng & bản đồ tra cứu trung tâm
│
├── 01-requirements/                    # [VAI TRÒ: YÊU CẦU & BÀI TOÁN NGHIỆP VỤ]
│   ├── README.md                       # Mục lục & nguyên tắc yêu cầu nhóm 01
│   ├── 01-PROBLEM_AND_SCOPE.md         # Bài toán, bối cảnh AS-IS/TO-BE, mục tiêu và phạm vi
│   ├── 02-REQUIREMENTS.md              # Yêu cầu chức năng phân tầng (FR-*)
│   ├── 03-NON_FUNCTIONAL_REQUIREMENTS.md # Yêu cầu phi chức năng: Performance, Security, Scalability (NFR-*)
│   ├── 04-USE_CASES.md                 # Sơ đồ và đặc tả 12 Use Cases cốt lõi (UC01–UC12)
│   └── 05-BUSINESS_RULES.md            # Danh mục 25 quy tắc nghiệp vụ 5 tầng thực thi (BR-*)
│
├── 02-domain-database/                 # [VAI TRÒ: MÔ HÌNH MIỀN & THIẾT KẾ CSDL]
│   ├── README.md                       # Mục lục & nguyên tắc dữ liệu nhóm 02
│   ├── 06-DOMAIN_MODEL.md              # Ubiquitous Language, 8 Bounded Contexts & Aggregate Roots
│   ├── 07-STATE_MACHINES.md            # Máy trạng thái FSM (Order, Cart, DocumentVersion, SupportTicket)
│   ├── 09-DATABASE_DESIGN.md           # Thiết kế CSDL chi tiết 22 bảng, DDL PostgreSQL 16+, Numeric VNĐ
│   ├── 10-ERD.md                       # Sơ đồ Mermaid ERD 2 tầng & Phân định ranh giới PG vs Qdrant
│   └── 11-DATA_CLASSIFICATION.md       # Phân loại độ nhạy cảm dữ liệu & Bộ lọc PII tiếng Việt (NĐ 13)
│
├── 03-architecture-api/                # [VAI TRÒ: KIẾN TRÚC HỆ THỐNG & API CONTRACTS]
│   ├── README.md                       # Mục lục & nguyên tắc kiến trúc nhóm 03
│   ├── 00-DESIGN_REVIEW.md             # Đánh giá 10 tiêu chuẩn cổng Gate P0 (Recommend Approval)
│   ├── 08-ARCHITECTURE.md              # Kiến trúc C4 Model Level 1-3 & 3 Ranh giới an toàn Zero-Trust
│   ├── 12-API_DESIGN.md                # Đặc tả API Envelope, Mã lỗi, 13 Typed Tools cho Agent, SSE
│   ├── 15-SEQUENCE_DIAGRAMS.md         # Sơ đồ tuần tự 4 luồng cốt lõi (Auth, Agent, Checkout, RAG)
│   └── adr/                            # 9 Bản ghi quyết định kiến trúc then chốt (ADR-001..009)
│       ├── README.md
│       ├── ADR-001_qdrant_vs_pgvector.md
│       ├── ADR-002_internal_tools_vs_mcp.md
│       ├── ADR-003_single_agent_vs_multi_agent.md
│       ├── ADR-004_typed_sql_vs_text_to_sql.md
│       ├── ADR-005_inventory_and_order_lifecycle.md
│       ├── ADR-006_modular_monolith_architecture.md
│       ├── ADR-007_polyglot_architecture_nestjs_nextjs_python.md
│       ├── ADR-008_vietnamese_hierarchical_rag_and_async_ingestion.md
│       └── ADR-009_nextjs_bff_reverse_proxy_and_clean_architecture.md
│
├── 04-security-concurrency/            # [VAI TRÒ: AN NINH BẢO MẬT & TRANH CHẤP ĐỒNG THỜI]
│   ├── README.md                       # Mục lục & nguyên tắc an ninh nhóm 04
│   ├── 13-AUTH_AND_ACCESS_CONTROL.md   # JWT Stateless, Token Rotation, Phân quyền RBAC, Chống IDOR
│   ├── 14-THREAT_MODEL.md              # Mô hình đe dọa STRIDE 12 mã hiểm họa, Phòng thủ DoS / PII
│   └── 16-CONSISTENCY_AND_CONCURRENCY.md # Khóa bi quan FOR UPDATE chống Deadlock, Preview Token 10m
│
├── 05-backend/                            # [VAI TRÒ: DỊCH VỤ MÁY CHỦ NESTJS & SSOT]
│   ├── README.md                       # Bản đồ tra cứu & tổng quan NestJS Core Backend
│   ├── 01-BACKEND_ARCHITECTURE.md      # Kiến trúc NestJS, Modular Monolith, DI, Request Lifecycle
│   ├── 02-FEATURE_SPECIFICATIONS.md    # Đặc tả chi tiết các Features nghiệp vụ (thay cho modules)
│   ├── 03-TRANSACTION_AND_CONCURRENCY.md # Khóa bi quan TypeORM FOR UPDATE, Deadlock, Idempotency
│   ├── 04-INTERNAL_TOOL_GATEWAY.md     # Giao thức kết nối 13 Typed Tools với Python AI Agent
│   ├── 05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md # Pipeline xử lý ngầm: MinIO (S3), Redis Cache, BullMQ Worker
│   └── 06-ENTERPRISE_BEST_PRACTICES_FOODEE.md # 10 Tinh hoa kỹ thuật Enterprise từ foodee-be/core-api
│
├── 06-frontend/                        # [VAI TRÒ: THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG]
│   ├── README.md                       # Bản đồ tra cứu phân hệ giao diện người dùng
│   ├── 17-FRONTEND_DESIGN.md           # Kiến trúc Next.js 16+ App Router, FSD, BFF Proxy, Server Actions, Dynamic RBAC
│   ├── SCREEN_SPECIFICATIONS.md        # Đặc tả 9 màn hình chuẩn hóa (SCR-01 đến SCR-09)
│   ├── BRAND_AND_DESIGN_TOKENS.md      # Cyber-Retail Intelligence tokens, Typography, Dark Mode
│   └── wireframe/                      # Sơ đồ khung dây giao diện
│
├── 07-operations-devops/               # [VAI TRÒ: VẬN HÀNH, GIÁM SÁT & TRIỂN KHAI]
│   ├── README.md                       # Mục lục & nguyên tắc DevOps nhóm 07
│   ├── 18-OBSERVABILITY.md             # Structured JSON logs, OpenTelemetry Tracing, Arize Phoenix (6006), Probes (/health, /ready)
│   ├── 20-PERFORMANCE_PLAN.md          # Kế hoạch chịu tải Flash-Sale, Redis cache, Model Cascading, Circuit Breaker
│   ├── 21-DEPLOYMENT.md                # Docker Compose (Postgres, Redis, MinIO, Qdrant, Phoenix, Backend, Frontend), CI/CD Actions
│   └── 22-RISK_REGISTER.md             # Sổ đăng ký 8 rủi ro hệ thống trọng yếu & Kế hoạch ứng phó
│
├── 08-testing-execution/               # [VAI TRÒ: KIỂM THỬ TỰ ĐỘNG & KẾ HOẠCH THỰC THI]
│   ├── README.md                       # Mục lục & nguyên tắc QA nhóm 08
│   ├── 19-TEST_STRATEGY.md             # Kim tự tháp kiểm thử, 17 Acceptance Tests, Khung Cam Kết SLA & CI/CD Gating
│   └── 23-IMPLEMENTATION_PLAN.md       # Lộ trình 10 phân kỳ (P0–P9), DoD và tiêu chuẩn cổng chất lượng
│
├── 09-guidelines/                      # [VAI TRÒ: QUY CHUẨN LẬP TRÌNH & ĐÀO TẠO KỸ SƯ]
│   ├── README.md                       # Mục lục & nguyên tắc văn hóa kỹ thuật nhóm 09
│   ├── CODING_STANDARDS.md             # Quy chuẩn viết code Clean Code, AST Safe Calculator, 10 Anti-Patterns Checklist
│   ├── COMMIT_STANDARDS.md             # Conventional Commits 1.0.0 chuẩn Production
│   ├── LEARNING_GUIDE.md               # Cẩm nang phỏng vấn & đào tạo Senior AI Systems Engineer (MWG/FPT)
│   └── AI_PAIR_PROGRAMMING_GUIDE.md    # Cẩm nang cộng tác AI - Kỹ sư tuân thủ Hiến pháp AGENTS.md
│
├── 10-research-benchmarks/             # [VAI TRÒ: KHẢO SÁT KỸ THUẬT & MA TRẬN BẰNG CHỨNG THỰC NGHIỆM]
│   ├── README.md                       # Bản đồ tra cứu phân khu nghiên cứu & bằng chứng
│   ├── 01-EVIDENCE_MATRIX.md           # Master Evidence Matrix 16 repo mã nguồn mở (VIVPM, FlowAssist...)
│   ├── 02-COMMERCE_FLOW.md             # Phân tích luồng nghiệp vụ E-commerce shopping bot
│   ├── 03-INVENTORY_FLOW.md            # Phân tích luồng trừ tồn kho & khóa bi quan FOR UPDATE
│   ├── 04-RAG_FLOW.md                  # Phân tích luồng RAG Ingestion & Chunking băm SHA-256
│   ├── 05-AGENT_TOOL_FLOW.md           # Phân tích điều phối Tool, cấm Text-to-SQL, giới hạn MAX_STEPS = 5
│   ├── 06-SECURITY_RELIABILITY.md      # Khảo sát bảo mật OWASP LLM, PII tiếng Việt (Nghị định 13)
│   ├── 07-EVALUATION_BENCHMARK.md      # Bộ đánh giá chất lượng tất định (Deterministic Eval)
│   ├── 08-INTEGRATION_DECISIONS.md     # Quyết định tích hợp giải pháp bên thứ 3
│   └── 09-REJECTED_PATTERNS.md         # 10 mẫu phản thiết kế bị bác bỏ triệt để (Anti-Patterns)
│
└── 11-governance-progress/             # [VAI TRÒ: QUẢN TRỊ DỰ ÁN & TIẾN ĐỘ THỰC THI]
    ├── README.md                       # Bản đồ tra cứu phân khu quản trị & tiến độ
    ├── 01-DESIGN_BASELINE_SHA256.md    # Bảng băm SHA-256 niêm phong 38 tài liệu Phase 0
    ├── 02-PROJECT_STATUS.md            # Báo cáo tiến độ chi tiết 10 Phase (Phase 0 đến Phase 9)
    ├── 03-MICRO_DECISIONS.md           # Sổ nhật ký quyết định kiến trúc vi mô & trade-offs
    ├── 04-TEST_RESULTS.md              # Báo cáo kết quả thẩm định 10 cổng cứng Phase 0
    └── 05-NEXT_ACTIONS.md              # Kế hoạch hành động chuẩn bị chuyển sang Phase 1
```

---

## 🎯 2. Hướng Dẫn Tra Cứu Nhanh Cho Lập Trình Viên (Fast Lookup Table)

| Mục tiêu tra cứu | Thư mục chức năng | Tài liệu tham chiếu trực tiếp |
| :--- | :--- | :--- |
| **Hiểu bài toán nghiệp vụ & 3 Personas** | [`01-requirements/`](01-requirements/README.md) | [01-PROBLEM_AND_SCOPE.md](01-requirements/01-PROBLEM_AND_SCOPE.md) |
| **25 Quy tắc nghiệp vụ 5 tầng bảo vệ** | [`01-requirements/`](01-requirements/README.md) | [05-BUSINESS_RULES.md](01-requirements/05-BUSINESS_RULES.md) |
| **Cấu trúc CSDL 22 bảng, DDL, Numeric VNĐ** | [`02-domain-database/`](02-domain-database/README.md) | [09-DATABASE_DESIGN.md](02-domain-database/09-DATABASE_DESIGN.md) & [10-ERD.md](02-domain-database/10-ERD.md) |
| **Vòng đời đơn hàng, giỏ hàng & tài liệu RAG** | [`02-domain-database/`](02-domain-database/README.md) | [07-STATE_MACHINES.md](02-domain-database/07-STATE_MACHINES.md) |
| **Kiến trúc C4, API Envelope & 13 Typed Tools** | [`03-architecture-api/`](03-architecture-api/README.md) | [08-ARCHITECTURE.md](03-architecture-api/08-ARCHITECTURE.md) & [12-API_DESIGN.md](03-architecture-api/12-API_DESIGN.md) |
| **Sơ đồ tuần tự Auth, AI Chat, Chốt đơn, RAG** | [`03-architecture-api/`](03-architecture-api/README.md) | [15-SEQUENCE_DIAGRAMS.md](03-architecture-api/15-SEQUENCE_DIAGRAMS.md) |
| **Hồ sơ 9 Quyết định Kiến trúc (ADRs)** | [`03-architecture-api/adr/`](03-architecture-api/adr/README.md) | [ADR Index](03-architecture-api/adr/README.md) |
| **Khóa bi quan chống Oversell & Phòng thủ IDOR** | [`04-security-concurrency/`](04-security-concurrency/README.md)| [13-AUTH_AND_ACCESS_CONTROL.md](04-security-concurrency/13-AUTH_AND_ACCESS_CONTROL.md) & [16-CONSISTENCY_AND_CONCURRENCY.md](04-security-concurrency/16-CONSISTENCY_AND_CONCURRENCY.md) |
| **Kịch bản tấn công STRIDE & Bộ lọc PII NĐ 13** | [`04-security-concurrency/`](04-security-concurrency/README.md) | [14-THREAT_MODEL.md](04-security-concurrency/14-THREAT_MODEL.md) |
| **Kiến trúc NestJS Backend Core & Khóa kho** | [`05-backend/`](05-backend/README.md) | [01-BACKEND_ARCHITECTURE.md](05-backend/01-BACKEND_ARCHITECTURE.md) & [03-TRANSACTION_AND_CONCURRENCY.md](05-backend/03-TRANSACTION_AND_CONCURRENCY.md) |
| **Cổng kết nối 13 Tools Tác tử AI qua NestJS** | [`05-backend/`](05-backend/README.md) | [04-INTERNAL_TOOL_GATEWAY.md](05-backend/04-INTERNAL_TOOL_GATEWAY.md) |
| **Pipeline Async MinIO, Redis & BullMQ Queue** | [`05-backend/`](05-backend/README.md) | [05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md](05-backend/05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md) |
| **10 Tinh hoa kỹ thuật Enterprise từ Foodee** | [`05-backend/`](05-backend/README.md) | [06-ENTERPRISE_BEST_PRACTICES_FOODEE.md](05-backend/06-ENTERPRISE_BEST_PRACTICES_FOODEE.md) |
| **Giao diện Client & Đặc tả 9 màn hình** | [`06-frontend/`](06-frontend/README.md) | [17-FRONTEND_DESIGN.md](06-frontend/17-FRONTEND_DESIGN.md) & [SCREEN_SPECIFICATIONS.md](06-frontend/SCREEN_SPECIFICATIONS.md) |
| **Giám sát OpenTelemetry, Circuit Breaker & Docker** | [`07-operations-devops/`](07-operations-devops/README.md) | [18-OBSERVABILITY.md](07-operations-devops/18-OBSERVABILITY.md) & [21-DEPLOYMENT.md](07-operations-devops/21-DEPLOYMENT.md) |
| **17 Acceptance Tests & Ma trận RTM** | [`08-testing-execution/`](08-testing-execution/README.md) | [19-TEST_STRATEGY.md](08-testing-execution/19-TEST_STRATEGY.md) |
| **Lộ trình từng bước khi code (Phase 0 $\to$ 9)** | [`08-testing-execution/`](08-testing-execution/README.md) | [23-IMPLEMENTATION_PLAN.md](08-testing-execution/23-IMPLEMENTATION_PLAN.md) |
| **Bộ câu hỏi phỏng vấn AI Systems Engineer & Coding** | [`09-guidelines/`](09-guidelines/README.md) | [LEARNING_GUIDE.md](09-guidelines/LEARNING_GUIDE.md) & [CODING_STANDARDS.md](09-guidelines/CODING_STANDARDS.md) |
| **Ma trận bằng chứng 16 Repo & Mẫu phản thiết kế** | [`10-research-benchmarks/`](10-research-benchmarks/README.md) | [01-EVIDENCE_MATRIX.md](10-research-benchmarks/01-EVIDENCE_MATRIX.md) & [09-REJECTED_PATTERNS.md](10-research-benchmarks/09-REJECTED_PATTERNS.md) |
| **Bảng băm SHA-256 niêm phong & Báo cáo tiến độ** | [`11-governance-progress/`](11-governance-progress/README.md) | [01-DESIGN_BASELINE_SHA256.md](11-governance-progress/01-DESIGN_BASELINE_SHA256.md) & [02-PROJECT_STATUS.md](11-governance-progress/02-PROJECT_STATUS.md) |
