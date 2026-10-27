# 18 — Observability, Logging & Monitoring Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/07-operations-devops/18-OBSERVABILITY.md`  
**Căn cứ đặc tả**: `docs/research/evaluation.md` & `prompt_sections/04_PHASE_PLAN.md` (P8)  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Kiến Trúc Khả Năng Quan Sát 3 Trụ Cột (Observability Architecture)

Hệ thống được thiết kế theo 3 trụ cột khả năng quan sát tiêu chuẩn: **Structured JSON Logging**, **OpenTelemetry Tracing** và **Dual Health Checks**:

```mermaid
flowchart TB
    %% ==========================================
    %% OBSERVABILITY TIERS PALETTE
    %% ==========================================
    classDef appCore fill:#0F172A,stroke:#6366F1,stroke-width:2.5px,color:#FFFFFF,rx:10,ry:10
    classDef logStyle fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#E0F2FE,rx:8,ry:8
    classDef traceStyle fill:#1E1B4B,stroke:#8B5CF6,stroke-width:2px,color:#EDE9FE,rx:8,ry:8
    classDef probeStyle fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#D1FAE5,rx:8,ry:8
    classDef sinkStyle fill:#1E293B,stroke:#94A3B8,stroke-width:1.5px,stroke-dasharray: 4 4,color:#F8FAFC,rx:8,ry:8

    App["⚡ NestJS Commerce Core & Python LangGraph Engine"]:::appCore

    subgraph Pillars ["📊 3 TRỤ CỘT KHẢ NĂNG QUAN SÁT (OBSERVABILITY PILLARS)"]
        direction LR
        LogStream["1. STRUCTURED JSON LOGS<br/>• Correlation Request-ID<br/>• Khử trùng PII NĐ 13 tự động<br/>• Không lưu mật khẩu/token"]:::logStyle
        TraceStream["2. OPENTELEMETRY GENAI TRACES<br/>• 11 Spans chuẩn hóa<br/>• Đo độ trễ từng Tool<br/>• Đếm Token FinOps DuckDB"]:::traceStyle
        HealthCheck["3. DUAL HEALTH PROBES<br/>• Liveness /health (CPU/RAM)<br/>• Readiness /ready (PG, Qdrant)<br/>• Tự phục hồi Docker"]:::probeStyle
    end

    subgraph Sinks ["🎯 HẠ TẦNG THU THẬP & CẢNH BÁO"]
        direction LR
        Loki["Grafana Loki / Logstash"]:::sinkStyle
        Jaeger["Jaeger / Langfuse Dashboard"]:::sinkStyle
        DockerK8s["Docker Engine / Kubernetes"]:::sinkStyle
    end

    App ==> LogStream
    App ==> TraceStream
    App ==> HealthCheck

    LogStream --> Loki
    TraceStream --> Jaeger
    HealthCheck --> DockerK8s
```

---

## 2. Định Dạng Nhật Ký Có Cấu Trúc (Structured JSON Logging)

Mọi log ghi ra console (`stdout`) đều ở định dạng JSON chuẩn để dễ dàng phân tích và cảnh báo tự động:

```json
{
  "timestamp": "2026-10-20T18:00:00.150Z",
  "level": "INFO",
  "logger": "app.modules.agents.orchestrator",
  "message": "Tool execution completed successfully.",
  "context": {
    "request_id": "req-c8d7e9f1-4b2a-4f9e-8c3d-1a2b3c4d5e6f",
    "user_id": "usr-8a2f1c3d-...",
    "role": "CUSTOMER",
    "conversation_id": "conv-9f1e2d3c-...",
    "tool_name": "search_products",
    "step_index": 1,
    "latency_ms": 32.4,
    "items_found": 3
  }
}
```

### Quy Tắc Thanh Lọc Nhật Ký Bắt Buộc:
* **CẤM TUYỆT ĐỐI GHI**: `password_hash`, `jwt_token`, `api_key`, `credit_card`.
* **LÀM SẠCH PII TIẾNG VIỆT**: Mọi trường văn bản người dùng trong log đều phải đi qua bộ lọc thay thế `[REDACTED_CCCD]`, `[REDACTED_PHONE]`, `[REDACTED_EMAIL]`.

---

## 3. Điểm Kiểm Tra Sức Khỏe Dịch Vụ (`/health` & `/ready`)

Hệ thống cung cấp 2 endpoint độc lập phục vụ kiểm tra sức khỏe liveness và readiness:

### 3.1. Liveness Probe (`GET /health`)
Xác nhận ứng dụng FastAPI còn phản hồi, trả về HTTP `200 OK`:
```json
{
  "status": "UP",
  "version": "1.0.0",
  "uptime_seconds": 3600
}
```

### 3.2. Readiness Probe (`GET /ready`)
Xác nhận khả năng phục vụ lưu lượng mạng bằng cách kiểm tra kết nối tới các dịch vụ phụ thuộc:
```json
{
  "status": "READY",
  "dependencies": {
    "postgresql": { "status": "UP", "latency_ms": 2.1 },
    "qdrant": { "status": "UP", "latency_ms": 4.5 },
    "llm_provider": { "status": "UP", "latency_ms": 120.0 }
  }
}
```
* Nếu PostgreSQL hoặc Qdrant mất kết nối, endpoint trả về mã lỗi HTTP `503 Service Unavailable`.

---

## 4. Chỉ Số Đo Lường Định Lượng AI & Nghiệp Vụ (Key Telemetry Metrics)

1. **Hiệu Năng & Độ Trễ (Latency Distribution)**:
   - $P50 \le 800\text{ms}$, $P95 \le 2500\text{ms}$ cho câu trả lời tư vấn AI Agent có gọi tool.
   - $P50 \le 50\text{ms}$, $P95 \le 150\text{ms}$ cho các API truy vấn Catalog và Giỏ hàng.
2. **Độ Tin Cậy Tác Tử AI (Agent Reliability)**:
   - Tỷ lệ hoàn thành nhiệm vụ (Task Completion Rate) $\ge 95\%$.
   - Tỷ lệ vượt ngưỡng lặp (`MAX_STEPS > 5`) $\le 1\%$.
   - 0 trường hợp hallucination về giá niêm yết và số lượng tồn kho khả dụng.

---

## 5. Tích Hợp Arize Phoenix — Giám Sát AI Agent Tự Lưu Trữ (Self-Hosted AI Tracing)

Nhằm bảo vệ dữ liệu khách hàng theo Nghị định 13/2023/NĐ-CP và không bị giới hạn số lượng traces từ các dịch vụ SaaS đám mây, hệ thống tích hợp **Arize Phoenix** (Mã nguồn mở, 0 đồng chi phí):

```mermaid
flowchart LR
    LangGraph["LangGraph Agent Runtime<br/>(agent-system)"] -->|OpenTelemetry Tracer| PhoenixCollector["Phoenix OpenTelemetry Collector<br/>(Port 6006)"]
    PhoenixCollector --> Dashboard["Phoenix Web UI Dashboard<br/>• Tracing từng Node & Tool Call<br/>• UMAP Embedding Visualization<br/>• Phát hiện Embedding Data Drift"]
```

### 5.1. Các Tính Năng Giám Sát Chuyên Biệt Cho AI Agent
1. **LangGraph StateGraph Tracing**: Ghi vết thời gian thực từng bước chuyển trạng thái (`router_node` $\to$ `search_products` $\to$ `format_response`), ghi nhận chính xác input, output, số token tiêu thụ và độ trễ từng tool.
2. **Trực Quan Hóa Không Gian Vector (Embedding UMAP)**: Chiếu không gian vector 1536 chiều của các câu hỏi khách hàng lên biểu đồ 2D/3D để đối chiếu với các vector chính sách trong Qdrant.
3. **Phát Hiện Trôi Dữ Liệu & Câu Hỏi Ngoài Vùng Tri Thức (Out-of-Domain Drift)**: Nhận diện khi khách hàng hỏi những nội dung không liên quan đến laptop (ví dụ: tư vấn bất động sản, code game) để tinh chỉnh bộ định tuyến Router.

### 5.2. Khởi Chạy Phoenix Qua Docker Compose
```yaml
  phoenix:
    image: arize-ai/phoenix:latest
    container_name: retailmind_phoenix
    ports:
      - "6006:6006"
    environment:
      - PHOENIX_PORT=6006
    restart: unless-stopped
```

