# 15 — Sequence Diagrams for Critical Business Flows

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/03-architecture-api/15-SEQUENCE_DIAGRAMS.md`  
**Căn cứ đặc tả**: `docs/research/commerce-flow.md`, `agent-tool-flow.md`, `rag-flow.md` & `ADR-005`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Luồng Xác Thực & Cấp Phát Token (UC01: Auth & Token Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    box rgba(56, 189, 248, 0.08) "Giao Diện Người Dùng (Client Tier)"
        actor Customer as Khách hàng
        participant Client as Frontend (Next.js 16+ App Router)
    end
    box rgba(99, 102, 241, 0.08) "Dịch Vụ Xác Thực & Bảo Mật (App Tier)"
        participant AuthAPI as AuthController (/api/v1/auth)
        participant AuthService as AuthService
        participant Hasher as PasswordHasher (Argon2id)
    end
    box rgba(236, 72, 153, 0.08) "Dữ Liệu Chân Lý (Data Tier)"
        participant DB as PostgreSQL 16+ SSOT
    end

    Customer->>Client: 1. Nhập email & mật khẩu
    Client->>AuthAPI: 2. POST /api/v1/auth/login (email, password)
    AuthAPI->>AuthService: 3. authenticate(email, password)
    AuthService->>DB: 4. SELECT id, password_hash, is_active, role_id FROM users WHERE email = :email
    DB-->>AuthService: 5. Trả về bản ghi User
    
    alt Người dùng không tồn tại hoặc tài khoản bị khóa (is_active = false)
        AuthService-->>Client: 401 Unauthorized / 403 Account Inactive
    end

    AuthService->>Hasher: 6. verify(password, password_hash)
    alt Mật khẩu không chính xác
        Hasher-->>Client: 401 Unauthorized (AUTH_INVALID_CREDENTIALS)
    end

    AuthService->>AuthService: 7. Ký JWT Access Token (15m) & Refresh Token (7d)
    AuthService-->>Client: 8. 200 OK {access_token, refresh_token, user: {id, email, role}}
    Client->>Client: 9. Lưu trữ Token an toàn & Cập nhật trạng thái
```

---

## 2. Luồng Hội Thoại AI Agent & Bộ Giáp AI Harness (UC03: Agentic Advisor & Harness Flow)

```mermaid
sequenceDiagram
    autonumber
    box rgba(56, 189, 248, 0.08) "Tầng Tương Tác Trực Tuyến (Client Tier)"
        actor Customer as Khách hàng
        participant Client as Frontend (EventSource SSE)
    end
    box rgba(245, 158, 11, 0.08) "Bộ Giáp AI Harness (Security & FinOps)"
        participant Guard as Step 1 & 2: Input Guard & Token Budget
        participant FactCheck as Step 4: Output Guard (check_facts)
        participant OTel as Step 5: Audit Log & Telemetry
    end
    box rgba(139, 92, 246, 0.08) "Tác Tử Suy Luận & Công Cụ (Agent Tier)"
        participant Graph as LangGraph StateGraph (Trần 5 Bước)
        participant Tool as Step 3: Tool Execution Sandbox
        participant LLM as LLM Provider (OpenAI/Claude)
    end
    box rgba(236, 72, 153, 0.08) "Chân Lý Dữ Liệu (SSOT)"
        participant DB as PostgreSQL 16+ SSOT
    end

    Customer->>Client: "Tư vấn laptop văn phòng dưới 20 triệu RAM 16GB"
    Client->>Guard: POST /api/v1/conversations/{id}/messages (SSE)
    Guard->>Guard: Khử trùng PII (CCCD, SĐT) + Áp trần ngân sách Token
    Guard->>Graph: invoke(sanitized_state, thread_id)
    
    loop Chu trình ReAct hữu hạn (Tối đa 5 bước lặp)
        Graph->>LLM: Gửi Prompt an toàn + Định nghĩa 13 Typed Tools
        LLM-->>Graph: Trả về tool_calls: "search_products(budget_vnd=20000000, min_ram_gb=16)"
        Graph->>Tool: Thực thi công cụ qua Pydantic Sandbox
        Tool->>DB: Parameterized SQL truy vấn variants & specs
        DB-->>Tool: Trả về kết quả 3 laptop phù hợp
        Tool-->>Graph: Trả về dữ liệu định kiểu (Observation)
    end

    Graph->>LLM: Soạn câu trả lời tư vấn hoàn chỉnh
    LLM-->>Graph: Trả về văn bản kèm mã sản phẩm & giá đề xuất
    Graph->>FactCheck: Chuyển câu trả lời thô qua Output Guard
    
    FactCheck->>DB: Đối soát giá & tồn kho của sản phẩm được nhắc tới
    alt LLM phát sinh giá ảo (Hallucination)
        FactCheck->>FactCheck: Tự động hiệu chỉnh về giá niêm yết SSOT
    end

    FactCheck->>OTel: Ghi vết kiểm toán & Thống kê Token tiêu thụ
    OTel-->>Client: Stream SSE Events (token, cards, citations, done)
    Client->>Customer: Hiển thị giao diện tư vấn sắc nét kèm Thẻ laptop
```

---

## 3. Luồng Chốt Đơn Giao Dịch & Khóa Bi Quan Chống Đua (UC08: Checkout & Race Condition)

Luồng xử lý khi 2 khách hàng cùng gửi yêu cầu chốt mua một chiếc laptop duy nhất còn lại trong kho:

```mermaid
sequenceDiagram
    autonumber
    box rgba(56, 189, 248, 0.08) "Hai Khách Hàng Đồng Thời (Concurrent Users)"
        actor Alice as Khách A (Đến trước 2ms)
        actor Bob as Khách B (Đến sau 2ms)
    end
    box rgba(99, 102, 241, 0.08) "Dịch Vụ Chốt Đơn (Commerce Service)"
        participant API as OrderCheckoutService
    end
    box rgba(236, 72, 153, 0.08) "Cơ Sở Dữ Liệu PostgreSQL (ACID Lock)"
        participant DB as PostgreSQL 16+ (SSOT Engine)
    end

    Note over Alice,Bob: Cửa hàng chỉ còn duy nhất 1 chiếc Laptop SKU-X (available_qty = 1)
    Alice->>API: POST /api/v1/orders/confirm (Signed Token A, Idem-Key A)
    Bob->>API: POST /api/v1/orders/confirm (Signed Token B, Idem-Key B)
    
    par Xử lý Khách A (Giữ khóa trước)
        API->>DB: 1. BEGIN TRANSACTION
        API->>DB: 2. SELECT * FROM inventory WHERE variant_id = X FOR UPDATE
        Note over DB: Dòng tồn kho SKU-X bị KHÓA BI QUAN (Pessimistic Lock)
        DB-->>API: on_hand=1, reserved=0 -> available=1 (ĐỦ HÀNG)
        API->>DB: 3. UPDATE inventory SET reserved_qty = reserved_qty + 1
        API->>DB: 4. INSERT INTO orders (order_no, status='confirmed', ...)
        API->>DB: 5. INSERT INTO order_items (...) Snapshot giá & thông số
        API->>DB: 6. COMMIT TRANSACTION (Giải phóng khóa dòng)
        API-->>Alice: 201 Created (Đơn hàng A thành công)
    and Xử lý Khách B (Bị khóa chặn)
        API->>DB: 1. BEGIN TRANSACTION
        API->>DB: 2. SELECT * FROM inventory WHERE variant_id = X FOR UPDATE
        Note over DB: Luồng B BỊ CHẶN (Wait Block) chờ Luồng A Commit xong
        DB-->>API: on_hand=1, reserved=1 -> available=0 (HẾT HÀNG)
        API->>DB: 3. ROLLBACK TRANSACTION
        API-->>Bob: 409 Conflict (INSUFFICIENT_STOCK: Sản phẩm đã hết hàng)
    end
```

---

## 4. Luồng RAG Chính Sách Bảo Hành Xác Minh Hai Chiều (UC05: Two-Way Verified RAG)

```mermaid
sequenceDiagram
    autonumber
    box rgba(56, 189, 248, 0.08) "Khách Hàng (Client Tier)"
        actor User as Khách hàng / Guest
    end
    box rgba(99, 102, 241, 0.08) "Tầng Dịch Vụ Tri Thức (RAG Pipeline)"
        participant RAG as KnowledgeRetrievalService
        participant LLM as LLM Provider
    end
    box rgba(168, 85, 247, 0.08) "Chỉ Mục Ngữ Nghĩa (Vector Index)"
        participant Qdrant as Qdrant Vector DB
    end
    box rgba(236, 72, 153, 0.08) "Chân Lý Dữ Liệu (PostgreSQL SSOT)"
        participant PG as PostgreSQL 16+ SSOT
    end

    User->>RAG: "Chính sách đổi trả laptop trong bao nhiêu ngày?"
    RAG->>RAG: Sinh Embedding Vector câu hỏi (dim=1536)
    RAG->>Qdrant: Search Collection 'retail_policies' (Cosine Similarity, Top 3)
    Qdrant-->>RAG: Trả về 3 chunks kèm metadata (document_version_id, chunk_id)

    RAG->>PG: SELECT id, status FROM document_versions WHERE id IN (:doc_version_ids)
    PG-->>RAG: Trả về trạng thái thực tế
    
    alt Nếu không tìm thấy hoặc status != 'published'
        RAG-->>User: 200 OK "Rất tiếc, hiện tại hệ thống chưa có thông tin chính sách chính thức được xuất bản về vấn đề này." (Honest Abstention)
    else Phiên bản tài liệu đang ở trạng thái 'published'
        RAG->>LLM: Gửi Context văn bản đã xác minh + Câu hỏi của khách
        LLM-->>RAG: Trả về câu trả lời chính sách có trích dẫn điều khoản
        RAG-->>User: 200 OK {answer, citations: [{document_version_id, chunk_id, policy_name}]}
    end
```

---

## 5. Luồng Cổng Phê Duyệt Tác Vụ Con Người (HITL Approval Gate & Hash Chain Ledger)

```mermaid
sequenceDiagram
    autonumber
    box rgba(56, 189, 248, 0.08) "Khách Hàng & Quản Trị Viên (Actors)"
        actor Customer as Khách hàng
        actor Admin as Quản trị viên (ADM01)
    end
    box rgba(245, 158, 11, 0.08) "Tầng Tác Tử & Kiểm Soát (Agent Tier)"
        participant Agent as LangGraph Agent Runtime
        participant HITL as HITL Gate Controller
    end
    box rgba(99, 102, 241, 0.08) "Tầng Dịch Vụ Cốt Lõi (Core Backend)"
        participant Core as NestJS Core Commerce
    end
    box rgba(236, 72, 153, 0.08) "Chân Lý & Sổ Cái (Data Tier)"
        participant DB as PostgreSQL SSOT
        participant Ledger as Tamper-Evident Hash Chain
    end

    Customer->>Agent: 1. "Đơn hàng giao trễ 2h, yêu cầu bồi hoàn 500.000 VNĐ"
    Agent->>Agent: 2. Nhận diện ý định bồi hoàn tài chính (500.000 VNĐ)
    Agent->>Agent: 3. Kiểm tra ngưỡng tự động: 500.000 ₫ > Ngưỡng trần (200.000 ₫)
    Agent->>HITL: 4. Tạo tác vụ chờ duyệt: task-hitl-8821 (status: PENDING)
    Agent-->>Customer: 5. SSE Event: hitl_pending ("Yêu cầu đã chuyển Quản lý phê duyệt")

    Admin->>HITL: 6. GET /api/v1/admin/hitl/queue (Xem danh sách chờ duyệt)
    HITL-->>Admin: 7. Hiển thị task-hitl-8821 kèm chi tiết đơn hàng & lý do
    Admin->>HITL: 8. POST /api/v1/admin/hitl/task-hitl-8821/action {action: 'APPROVE'}
    
    HITL->>Core: 9. Thực thi bồi hoàn tài chính an toàn
    Core->>DB: 10. BEGIN TX -> Cập nhật ví tiền khách hàng -> COMMIT TX
    
    HITL->>Ledger: 11. Ghi nhận khối băm H_i = SHA256(H_prev || Action_Payload)
    Ledger-->>Admin: 12. 200 OK (Phê duyệt thành công, Sổ cái đã niêm phong)
```

