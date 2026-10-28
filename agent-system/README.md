# Enterprise Agentic AI Platform (v3.0.0 Production Edition)

Nền tảng Tác tử Doanh nghiệp chuẩn hóa theo mô hình **Agent = Model + Harness (10 Lớp)**, tách biệt hoàn toàn giữa **Core Platform độc lập** và **Domain Packs chuyên biệt** (Zero Hardcoded Business Logic in Core).

---

## 1. Triết Lý Thiết Kế & Hiến Pháp Kỹ Thuật

1. **Agent = Model + Harness (10 Lớp):** LLM chỉ đảm nhận vai trò bộ xử lý suy luận (Reasoning Engine). Mọi kiểm soát an toàn, phân quyền, thẩm định tài chính, lưu vết kiểm toán và quản lý trạng thái do Harness đảm trách.
2. **Nguyên Tắc Ranh Giới Tác Tử (Agent Execution Boundary):**
   $$\text{LLM Proposes} \longrightarrow \text{Pydantic Typed Validation} \longrightarrow \text{Server-Side RBAC} \longrightarrow \text{Policy Rule (Decimal)} \longrightarrow \text{HITL Gate} \longrightarrow \text{Trusted Backend Executes}$$
   - LLM tuyệt đối không có quyền kết nối CSDL trực tiếp, không cấp quyền Shell / Docker.
3. **Chân Lý Dữ Liệu & Số Học Tiền Tệ Tuyệt Đối:**
   - Số học tiền tệ sử dụng 100% `Decimal` (Python) / `string` (JSON) / `NUMERIC(18, 0)` (PostgreSQL). Nghiêm cấm dùng `float` để triệt tiêu sai số làm tròn tài chính.
   - Khóa Idempotency chuẩn: `sha256(thread_id + tool_call_id)` bảo vệ mọi công cụ có hiệu ứng phụ (side-effect).
4. **Bảo Vệ Quyền Riêng Tư & An Toàn Tác Tử:**
   - Làm sạch PII tiếng Việt (CCCD 12 số, SĐT 10 số, Email, Số thẻ) theo Nghị định 13/2023/NĐ-CP và Luật Dữ liệu cá nhân 91/2025/QH15.
   - Phản tư thực thụ (True Critic Loop): Phản tư độc lập đánh giá tính căn cứ (Grounding Score >= 0.75). Từ chối dứt khoát nếu không có căn cứ từ tài liệu tri thức (No Hallucination).

---

## 2. Kiến Trúc 10 Lớp Harness

```
src/agent_platform/
├── config/                  # Quản lý cấu hình đa tầng (Base + Overlays: dev/test/prod)
├── domain/                  # Quản lý & nạp Domain Packs động (DomainPack, DomainRegistry)
├── llm/                     # Cổng kết nối mô hình (LLMPort, OpenAI-compat, Gemini native, Scripted, Circuit Breaker)
├── agents/                  # Tầng Tác tử & Điều phối Thông minh (Agentic Core)
│   ├── base.py              # BaseAgent (Hợp đồng tác tử trừu tượng với __call__ node protocol)
│   ├── enterprise_agent.py  # EnterpriseAgent (Persona, lọc tool RBAC, suy luận ReAct và tiếp nhận phản tư Critic)
│   └── workflow/            # Tầng Điều phối (LangGraph Cyclic Workflow: input_guard -> agent <-> tool_exec <-> critic -> finalize/abstain)
│       ├── builder.py       # Dựng đồ thị điều phối tuần hoàn (build_orchestration_graph)
│       ├── runner.py        # Quản lý phiên thực thi (OrchestratorRunner / AgentRunner)
│       └── nodes/           # Các trạm điều phối: input_guard, tool_exec, critic, finalize, abstain
├── harness/                 # Tầng Khung Bảo vệ & Dịch vụ Nền tảng (Platform Safety & Infrastructure)
│   ├── state/               # Lớp 1: Contracts & Principal (AgentState, Evidence, ToolEvent, RBAC Principal)
│   ├── guards/              # Lớp 2: Bảo vệ An toàn (Input Sanitizer, PII Redactor, Prompt Injection Guard)
│   ├── reliability/         # Lớp 3: Độ tin cậy (ResilientLLMClient, Circuit Breaker, Auto-Fallback)
│   ├── tools/               # Lớp 4: Công cụ & Idempotency (@tool decorator, ToolRegistry, ToolExecutor 9 bước)
│   ├── governance/          # Lớp 5: Quản trị & Tuân thủ (PolicyEngine Decimal-safe, Tamper-Evident Hash Chain)
│   ├── hitl/                # Lớp 6: Can thiệp Con người (ApprovalStore, langgraph.types.interrupt)
│   ├── memory/              # Lớp 7: Bộ nhớ & RAG (Built-in Knowledge Retrieval Port)
│   ├── persistence/         # Lớp 8: Lưu trữ bền vững (Pluggable KVStorePort: In-Memory, SQLite, PostgreSQL)
│   └── observability/       # Lớp 9: Giám sát & FinOps (OpenTelemetry, Prometheus, FinOps Token Ledger Decimal)
└── api/                     # Cổng giao diện REST & SSE (FastAPI, JWT Auth, SSE Streaming, Global Masked Handler)
```

---

## 3. Cấu Trúc Domain Pack (Khả Năng Mở Rộng Không Chạm Core)

Mọi tri thức, công cụ nghiệp vụ, chính sách và tiêu chí đánh giá được đóng gói hoàn toàn trong thư mục `domains/<domain_name>/`:

```
domains/
└── retail_store/            # Gói nghiệp vụ bán lẻ công nghệ RetailMind AI (MWG)
    ├── domain.yaml          # Khai báo định danh, hạn mức, danh sách công cụ và cấu hình
    ├── policies.yaml        # Phân quyền RBAC và hạn mức phê duyệt tự động (Tiers Decimal)
    ├── tools.py             # Công cụ nghiệp vụ: lookup_laptop_catalog, query_order_status, request_return_or_refund
    ├── corpus/              # Tài liệu tri thức: catalog_laptop.md, policy_refund.md, policy_return.md
    ├── prompts/             # System Prompt & Critic Prompt chuyên biệt cho bán lẻ
    └── evals/               # Golden benchmark datasets (JSONL chuẩn đo lường)
```

---

## 4. Hướng Dẫn Vận Hành Nhanh (Quickstart)

### 4.1. Cài đặt Môi trường
```bash
# Cài đặt các gói phụ thuộc
pip install -e .
pip install pytest pytest-asyncio
```

### 4.2. Chạy Toàn Bộ Bộ Kiểm Thử Tự Động (Test Suite)
```bash
# Chạy toàn bộ unit, contract, integration và E2E tests
python -m pytest tests
```
Tất cả các bộ test kiểm tra:
- Khởi tạo & nạp cấu hình không phụ thuộc domain (`test_platform_setup.py`)
- Contract test đa nhà cung cấp LLM (`test_llm_providers.py`)
- Tool execution 9 bước, Idempotency & Tamper-Evident Hash Chain (`test_tools_and_policy.py`)
- LangGraph Cyclic Workflow & True Critic reflection (`test_agent_graph.py`)
- Phục hồi phiên & lưu trữ bền vững SQLite (`test_hitl_and_persistence.py`)
- API FastAPI, Xác thực JWT, Phân quyền RBAC, SSE Streaming (`test_api_security.py`)
- FinOps Token Ledger tính tiền chính xác bằng Decimal (`test_observability_finops.py`)
- Hệ thống kiểm tra chất lượng tự động (`test_evals.py`)
- Gói bán lẻ công nghệ `retail_store` chạy độc lập (`test_retail_domain.py`)
- Tương thích giao thức Frontend Web Client (`test_retail_frontend_compat.py`)
- Kiến trúc tác tử độc lập `BaseAgent` & `EnterpriseAgent` (`test_enterprise_agent.py`)

### 4.3. Khởi Chạy API Server
```bash
# Khởi chạy FastAPI Dev Server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Các Endpoint chính:
- `POST /v1/chat`: Tương tác hội thoại kèm SSE streaming thời gian thực.
- `GET /v1/hitl/pending`: Xem danh sách yêu cầu chờ duyệt của cấp Quản lý.
- `POST /v1/hitl/{approval_id}/approve`: Duyệt và tiếp tục thực thi tiến trình bị tạm dừng.
- `GET /v1/tools`: Liệt kê các công cụ khả dụng theo phân quyền người dùng (RBAC).
- `GET /v1/health`: Kiểm tra sức khỏe toàn diện hệ thống.

### 4.4. Đánh Giá Chất Lượng Tự Động (Eval Suite)
```bash
# Chạy bộ đánh giá chuẩn hóa cho domain retail_store
python scripts/run_evals.py --domain retail_store --env test
```

### 4.5. Nạp Tri Thức Vào Hệ Thống (Corpus Ingestion)
```bash
python scripts/ingest.py --domain retail_store
```

### 4.6. Tạo Domain Pack Mới Trong 1 Lệnh (Scaffolding)
```bash
python scripts/new_domain.py retail_store --description "Quản lý chuỗi bán lẻ & đổi trả hàng hóa"
```

---

## 5. Bảng So Sánh Kiến Trúc v2 vs v3

| Tiêu Chí | Phiên Bản Cũ (v2 Template) | Phiên Bản Mới (v3 Platform) |
| :--- | :--- | :--- |
| **Kiến trúc Core** | Bị ô nhiễm từ khóa bán lẻ / pháp lý rải rác trong `src/` | **100% Domain-Agnostic** (`src/agent_platform/` độc lập hoàn toàn) |
| **Workflow Tác tử** | Hardcoded logic if-else tĩnh | **LangGraph Cyclic StateGraph** có vòng lặp phản tư thực sự |
| **Số học tài chính** | Dùng `float` tiềm ẩn sai số làm tròn | **`Decimal` chuẩn mực** trong toàn bộ Rule, Tool & FinOps |
| **Khóa Idempotency** | Dùng `hash(args)` dễ trùng lặp | Chuẩn **`sha256(thread_id + tool_call_id)`** bảo vệ giao dịch |
| **Kiểm toán (Audit)** | Log text đơn giản | **Tamper-Evident SHA-256 Hash-Chain Ledger** bảo vệ toàn vẹn |
| **Tích hợp Domain** | Viết đè code core | **Domain Pack độc lập** (`domains/<name>/`) chỉ cần khai báo file |
| **Mô hình LLM** | Gắn chặt SDK cụ thể | **LLMPort trừu tượng** (OpenAI, Gemini REST native, Resilient fallback) |

---
*RetailMind AI Engineering Team — Production 2026 Edition*
