# 🏗️ CẨM NANG KIẾN TRÚC & CẤU TRÚC THƯ MỤC DỰ ÁN AI CHUẨN PRODUCTION
## Thiết Kế Hệ Thống Doanh Nghiệp (Enterprise AI Engineering) — Từ Tiếp Nhận Dữ Liệu Đến Tác Tử Suy Luận, Phòng Thủ Bền Bỉ & Vận Hành LLMOps
### *(Production-Grade AI System Directory Architecture & Capability-Driven Pipeline Blueprint)*

> **Phiên bản chuẩn hóa:** 2026 Enterprise Edition — Dành cho Kỹ sư AI Doanh nghiệp, Đồ án Tốt nghiệp (KLTN) & AI Startups  
> **Áp dụng triết lý:** AI Capability & Pipeline Architecture, Cognitive Harness, 12-Factor AI Systems, Zero-Trust Security, High Observability & FinOps Governance  
> **Tôn chỉ kỹ nghệ tối thượng:**  
> *"Cấu trúc thư mục phản ánh tư duy kiến trúc; Tránh bẫy Over-engineering của Web/CRUD cổ điển; Tổ chức hệ thống theo đúng dòng chảy dữ liệu và năng lực suy luận của AI."*

$$\text{Production AI System} = \text{Resilient Harness} + \text{Cognitive Agents} + \text{Robust Pipelines} + \text{Automated Evals}$$

---

## 📑 MỤC LỤC CHI TIẾT

- [1. TRIẾT LÝ KIẾN TRÚC & NGUYÊN TẮC THIẾT KẾ CHUẨN PRODUCTION](#1-triết-lý-kiến-trúc--nguyên-tắc-thiết-kế-chuẩn-production)
  - [1.1. Bốn Căn Bệnh Kinh Điển Của Dự Án AI Non Trẻ (Toy Project Pitfalls)](#11-bốn-căn-bệnh-kinh-điển-của-dự-án-ai-non-trẻ-toy-project-pitfalls)
  - [1.2. Chuyển Dịch Kiến Trúc: Từ OOP/DDD Cổ Điển Sang AI Capability & Pipeline Architecture](#12-chuyển-dịch-kiến-trúc-từ-oopddd-cổ-điển-sang-ai-capability--pipeline-architecture)
  - [1.3. Tam Giác Hợp Nhất 3 Track: Product (Track 1) ↔ Data Infra (Track 2) ↔ Agentic AI (Track 3)](#13-tam-giác-hợp-nhất-3-track-product-track-1--data-infra-track-2--agentic-ai-track-3)
- [2. CÂY THƯ MỤC TOÀN CẢNH DỰ ÁN AI CHUẨN PRODUCTION (THE MASTER REPO TREE)](#2-cây-thư-mục-toàn-cảnh-dự-án-ai-chuẩn-production-the-master-repo-tree)
- [3. GIẢI PHẪU CHI TIẾT 10 PHÂN KHU CHỨC NĂNG CỐT TỬ](#3-giải-phẫu-chi-tiết-10-phân-khu-chức-năng-cốt-tử)
  - [3.1. Phân khu 1: `configs/` & `src/core/` — Quản Trị Cấu Hình & Hạt Nhân Nền Tảng](#31-phân-khu-1-configs--srccore--quản-trị-cấu-hình--hạt-nhân-nền-tảng)
  - [3.2. Phân khu 2: `src/ingestion/` — Tiếp Nhận Dữ Liệu, Cắt Phân Cấp NĐ 30 & Làm Sạch PII NĐ 13](#32-phân-khu-2-srcingestion--tiếp-nhận-dữ-liệu-cắt-phân-cấp-nđ-30--làm-sạch-pii-nđ-13)
  - [3.3. Phân khu 3: `src/retrieval/` — Tìm Kiếm Lai Đa Tầng (Qdrant Dense/BM25, GraphRAG, Reranker)](#33-phân-khu-3-srcretrieval--tìm-kiếm-lai-đa-tầng-qdrant-densebm25-graphrag-reranker)
  - [3.4. Phân khu 4: `src/agents/` — Bộ Não Tác Tử, LangGraph Orchestration & Hội Đồng A2A](#34-phân-khu-4-srcagents--bộ-não-tác-tử-langgraph-orchestration--hội-đồng-a2a)
  - [3.5. Phân khu 5: `src/harness/` — Pháo Đài Bền Vững (Circuit Breaker, Semantic Cache, Fallback, AST)](#35-phân-khu-5-srcharness--pháo-đài-bền-vững-circuit-breaker-semantic-cache-fallback-ast)
  - [3.6. Phân khu 6: `src/finops/` — Giám Sát Chi Phí Token, Độ Trễ TTFT & Sổ Cái DuckDB OLAP](#36-phân-khu-6-srcfinops--giám-sát-chi-phí-token-độ-trễ-ttft--sổ-cái-duckdb-olap)
  - [3.7. Phân khu 7: `src/observability/` — Chuỗi 11 Spans OpenTelemetry & Prometheus Metrics](#37-phân-khu-7-srcobservability--chuỗi-11-spans-opentelemetry--prometheus-metrics)
  - [3.8. Phân khu 8: `src/api/` — Cổng Phục Vụ Đa Giao Thức (FastAPI SSE Streaming, CLI, MCP Server)](#38-phân-khu-8-srcapi--cổng-phục-vụ-đa-giao-thức-fastapi-sse-streaming-cli-mcp-server)
  - [3.9. Phân khu 9: `evals/` — Khung Đánh Giá Độc Lập, Golden Datasets & Calibrated Judge](#39-phân-khu-9-evals--khung-đánh-giá-độc-lập-golden-datasets--calibrated-judge)
  - [3.10. Phân khu 10: `deploy/` & `.github/` — DevOps, Dockerfile Multi-stage & CI/CD Pipeline](#310-phân-khu-10-deploy--github--devops-dockerfile-multi-stage--cicd-pipeline)
- [4. BỘ MÃ NGUỒN KHUNG CHUẨN MỰC (PRODUCTION BOILERPLATES)](#4-bộ-mã-nguồn-khung-chuẩn-mực-production-boilerplates)
  - [4.1. Quản lý Thư viện Hiện đại: `pyproject.toml` (Poetry/Uv, Ruff, Mypy Strict)](#41-quản-lý-thư-viện-hiện-đại-pyprojecttoml-poetryuv-ruff-mypy-strict)
  - [4.2. Quản trị Cấu hình Bất biến: `src/core/config.py` (Pydantic Settings v2)](#42-quản-trị-cấu-hình-bất-biến-srccoreconfigpy-pydantic-settings-v2)
  - [4.3. Gateway FastAPI Chuẩn Doanh Nghiệp: `src/api/main.py` (Lifespan, OTel, SSE)](#43-gateway-fastapi-chuẩn-doanh-nghiệp-srcapimainpy-lifespan-otel-sse)
  - [4.4. Cỗ Máy Cầu Dao Tự Động 3 Pha: `src/harness/circuit_breaker.py`](#44-cỗ-máy-cầu-dao-tự-động-3-pha-srcharnesscircuit_breakerpy)
  - [4.5. Triển Khai Toàn Diện Full-Stack: `docker-compose.yml`](#45-triển-khai-toàn-diện-full-stack-docker-composeyml)
  - [4.6. Tự Động Hóa Vận Hành Dự Án: `Makefile`](#46-tự-động-hóa-vận-hành-dự-án-makefile)
- [5. QUY CHUẨN ĐẶT TÊN, CODE STYLE & QUẢN TRỊ MÔI TRƯỜNG](#5-quy-chuẩn-đặt-tên-code-style--quản-trị-môi-trường)
  - [5.1. Quy ước Đặt Tên Tệp, Thư Mục, Lớp & Hàm (PEP 8 + Clean Code)](#51-quy-ước-đặt-tên-tệp-thư-mục-lớp--hàm-pep-8--clean-code)
  - [5.2. Nguyên Tắc Quản Trị Bí Mật (Zero Secrets in Git) & Multi-Environment `.env`](#52-nguyên-tắc-quản-trị-bí-mật-zero-secrets-in-git--multi-environment-env)
  - [5.3. Chiến Lược Phân Nhánh Git & Quy Chuẩn Commit (Conventional Commits)](#53-chiến-lược-phân-nhánh-git--quy-chuẩn-commit-conventional-commits)
- [6. DANH MỤC KIỂM TRA SẢN XUẤT 25 TIÊU CHÍ (PRODUCTION GO-LIVE CHECKLIST)](#6-danh-mục-kiểm-tra-sản-xuất-25-tiêu-chí-production-go-live-checklist)

---

# 1. TRIẾT LÝ KIẾN TRÚC & NGUYÊN TẮC THIẾT KẾ CHUẨN PRODUCTION

## 1.1. Bốn Căn Bệnh Kinh Điển Của Dự Án AI Non Trẻ (Toy Project Pitfalls)

Khi chuyển giao mã nguồn từ môi trường nghiên cứu (Jupyter Notebook) sang hệ thống sản xuất thương mại phục vụ hàng chục nghìn người dùng, hầu hết các nhóm phát triển đều mắc phải 4 căn bệnh trầm kha:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BỐN CĂN BỆNH KHIẾN HỆ THỐNG AI SỤP ĐỔ TRONG MÔI TRƯỜNG DOANH NGHIỆP                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. CĂN BỆNH "JUPYTER NOTEBOOK MONOLITH":                                               │
│    • Nhồi nhét toàn bộ logic: cào dữ liệu, gọi LLM, tính toán vector, vẽ biểu đồ và    │
│      chạy server vào 1 file duy nhất (`main.py` dài 3.000 dòng).                       │
│    • Không có kiểm thử tự động, không thể tách lớp, không thể mở rộng quy mô (Scale).   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. CĂN BỆNH "LEAKY ABSTRACTION" (RÒ RỈ TẦNG THỰC THI):                                 │
│    • Gọi trực tiếp API OpenAI/LangChain ở khắp mọi nơi trong mã nguồn giao diện.       │
│    • Khi đổi sang mô hình cục bộ vLLM hoặc thay đổi Vector DB từ Chroma sang Qdrant,   │
│      kỹ sư phải sửa lại toàn bộ hàng trăm file mã nguồn.                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. CĂN BỆNH "CHẾT CHÌM VÌ CHI PHÍ & THIẾU TỰ PHỤC HỒI":                                │
│    • Không có Semantic Cache: Câu hỏi lặp lại vẫn tốn 100% token gọi ra Cloud.         │
│    • Không có Circuit Breaker: Khi mạng bên thứ ba timeout, toàn bộ server văng mã    │
│      lỗi HTTP 500 trắng xóa trước mặt khách hàng.                                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 4. CĂN BỆNH "HỘP ĐEN PHÁP LÝ & BẢO MẬT":                                               │
│    • Hard-code API Key trong mã nguồn đẩy lên GitHub.                                  │
│    • Không lọc PII người dùng (vi phạm Nghị định 13/2023/NĐ-CP), không có cơ chế chặn  │
│      Prompt Injection gián tiếp bằng Zero-Width Unicode.                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1.2. Chuyển Dịch Kiến Trúc: Từ OOP/DDD Cổ Điển Sang AI Capability & Pipeline Architecture

Trong công nghệ phần mềm truyền thống (Web CRUD, Ngân hàng, Thương mại điện tử), kiến trúc **Clean Architecture / Domain-Driven Design (DDD)** với các tầng `domain` và `application` là chuẩn mực vàng. Tuy nhiên, khi áp đặt nguyên bản mô hình này vào các hệ thống **AI / RAG / Multi-Agent**, nó nhanh chóng trở thành một dạng **Over-engineering** và rơi vào bẫy **"The Wrapper-over-Wrappers Trap" (Bẫy lồng vỏ bọc)**:

1. **AI là Dòng chảy Xác suất (Probabilistic Pipeline), không phải Thực thể Đột biến (Mutating Entity):**  
   Trong CRUD, nghiệp vụ xoay quanh việc lưu và sửa đổi trạng thái thực thể (`User.update()`, `Order.cancel()`). Ngược lại, hệ thống AI là một **Data & Cognitive Pipeline**: Dữ liệu thô đi qua tiền xử lý, trích xuất ngữ cảnh, suy luận nhiều bước của tác tử, được bảo vệ bởi rào chắn an ninh và truyền tải theo thời gian thực (Streaming).
2. **Loại bỏ "Địa ngục trừu tượng" (Abstract Hell):**  
   Việc ép các khái niệm AI như Prompt, StateGraph, Vector Retriever vào `domain/models` hay `application/ports` khiến kỹ sư phải viết hàng chục class trung gian vô nghĩa chỉ để chuyển tiếp một chuỗi văn bản giữa API và LLM.

Do đó, kiến trúc chuẩn sản xuất hiện đại chuyển dịch hoàn toàn sang **AI Capability & Pipeline Architecture**:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                    DÒNG CHẢY NĂNG LỰC HỆ THỐNG AI SẢN XUẤT (AI CAPABILITY PIPELINE)          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘

  [Tài liệu thô / PDF / Request]
                │
                ▼
  ┌──────────────────────────┐    Nghị định 30 (Phân cấp điều khoản)
  │     src/ingestion/       │ ──► Nghị định 13 (Ẩn danh hóa PII)
  │ (Data Processing Engine) │    Loại bỏ Zero-Width Unicode
  └─────────────┬────────────┘
                │ Clean Chunks & Metadata
                ▼
  ┌──────────────────────────┐    Dense Embedding (bge-m3)
  │     src/retrieval/       │ ──► Qdrant Hybrid Search (Dense + BM25 RRF)
  │   (Knowledge Engine)     │    Neo4j GraphRAG & Cross-Encoder Reranker
  └─────────────┬────────────┘
                │ High-Relevance Context
                ▼
  ┌──────────────────────────┐    LangGraph StateGraph (TypedDict State)
  │       src/agents/        │ ──► Supervisor Router & Intent Classifier
  │   (Cognitive Engine)     │    Specialists, Reflection & Debate Council
  └─────────────┬────────────┘
                │ Candidate Response
                ▼
  ┌──────────────────────────┐    Circuit Breaker 3 Pha (CLOSED/OPEN/HALF_OPEN)
  │       src/harness/       │ ──► Semantic Cache Redis (Cosine >= 0.95, $0)
  │  (Resilience & Safety)   │    Fallback Ladder 5 bậc & AST Code Sandbox
  └─────────────┬────────────┘
                │ Verified & Safe Output
                ▼
  ┌──────────────────────────┐    FastAPI Server-Sent Events (SSE Streaming)
  │        src/api/          │ ──► Model Context Protocol (Anthropic MCP Server)
  │    (Serving Gateway)     │    OpenTelemetry Tracing & DuckDB FinOps
  └──────────────────────────┘
```

Mỗi phân khu trong `src/` đại diện cho một **Năng lực Kỹ thuật Độc lập (Autonomous Capability)**:
* **`src/core/`:** Nền tảng chia sẻ (Cấu hình Pydantic v2, Logging cấu trúc, Ngoại lệ chuẩn).
* **`src/ingestion/`:** Xử lý và làm sạch dữ liệu đầu vào (Decree 30 Chunking, PII Redactor, Unicode Scrubber).
* **`src/retrieval/`:** Động cơ tri thức (Dense, Sparse BM25, GraphRAG, Reranker).
* **`src/agents/`:** Bộ não suy luận (LangGraph StateGraph, Supervisor, Roles, Multi-Agent Debate).
* **`src/harness/`:** Pháo đài ổn định & an toàn (Circuit Breakers, Semantic Cache, Fallback Ladder, AST Sandbox).
* **`src/finops/`:** Quản trị kinh tế đơn vị (Đo token, tính chi phí, phân tích DuckDB OLAP).
* **`src/observability/`:** Khả năng quan sát (11 Spans OpenTelemetry, Prometheus metrics).
* **`src/api/`:** Cổng phục vụ đa giao thức (FastAPI SSE Streaming, CLI, MCP Server).

---

## 1.3. Tam Giác Hợp Nhất 3 Track: Product (Track 1) ↔ Data Infra (Track 2) ↔ Agentic AI (Track 3)

Cấu trúc thư mục được xây dựng để trở thành giao điểm hợp nhất của toàn bộ 3 phân hệ lớn của chương trình AI Doanh nghiệp:
- **Track 1 (Product & Business Steering):** Phản ánh qua thư mục `evals/` (Bộ kiểm định chất lượng, Calibrated Judge, Cohen's Kappa κ ≥ 0.81), và `src/finops/` (Đo đạc đơn vị kinh tế $/1M tokens, Cost-per-Job).
- **Track 2 (Data Infrastructure & LLMOps):** Phản ánh qua `src/ingestion/` (Lakehouse Medallion, Delta Lake ACID), `src/harness/` (Circuit Breakers, Semantic Cache), và `deploy/` (Docker Multi-stage, Kubernetes, Prometheus, Grafana).
- **Track 3 (Advanced Agentic AI & RAG):** Phản ánh qua `src/agents/` (LangGraph Multi-Agent, Supervisor-Workers, Debate Arena), `src/retrieval/` (Qdrant Hybrid Search, Neo4j GraphRAG), và `src/api/` (SSE Streaming, Anthropic Model Context Protocol MCP Servers).

---

# 2. CÂY THƯ MỤC TOÀN CẢNH DỰ ÁN AI CHUẨN PRODUCTION (THE MASTER REPO TREE)

Dưới đây là kiến trúc thư mục chuẩn mực toàn diện nhất, có thể đáp ứng từ quy mô đồ án tốt nghiệp xuất sắc (Capstone KLTN) đến nền tảng Microservices phục vụ triệu người dùng của doanh nghiệp:

```text
enterprise-ai-platform/                     # Thư mục gốc dự án (Monorepo Root)
├── .github/                                # Tự động hóa CI/CD & Quản trị mã nguồn
│   ├── workflows/                          # GitHub Actions Workflows
│   │   ├── ci-quality-gate.yml             # Lint (Ruff), Type-check (Mypy), Unit Tests
│   │   ├── eval-regression.yml             # Chạy tự động Golden Dataset Eval trước khi Merge
│   │   ├── docker-build-push.yml           # Đóng gói và đẩy Container Image lên Registry
│   │   └── cd-deploy-staging.yml           # Triển khai tự động lên môi trường Staging/Prod
│   ├── ISSUE_TEMPLATE/                     # Biểu mẫu báo lỗi và yêu cầu tính năng
│   │   ├── bug_report.md
│   │   └── security_report.md
│   └── pull_request_template.md            # Checklist bắt buộc khi nộp Pull Request
│
├── configs/                                # Quản trị cấu hình phân tầng (Environment-Driven)
│   ├── base.yaml                           # Cấu hình dùng chung mặc định
│   ├── development.yaml                    # Môi trường lập trình Local (Mock LLM, SQLite)
│   ├── staging.yaml                        # Môi trường kiểm thử tích hợp (GPU Cluster nhỏ)
│   ├── production.yaml                     # Môi trường sản xuất chịu tải cao (vLLM, K8s)
│   ├── tool_manifest.yaml                  # Khai báo quyền hạn công cụ & Denied Capabilities
│   └── logging.yaml                        # Định dạng ghi log JSON chuẩn cấu trúc
│
├── deploy/                                 # Cơ sở hạ tầng dưới dạng mã nguồn (IaC) & Triển khai
│   ├── docker/                             # Tập tin môi trường Docker tối ưu hóa
│   │   ├── Dockerfile.app                  # Multi-stage build cho FastAPI Web Service
│   │   ├── Dockerfile.worker               # Container chạy background worker / Celery
│   │   └── Dockerfile.eval                 # Container cô lập chạy Benchmark & Red Teaming
│   ├── kubernetes/                         # Triển khai cụm Kubernetes (K8s Manifests)
│   │   ├── base/                           # Tài nguyên K8s cơ bản (Deployment, Service)
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── hpa.yaml                    # Tự động co giãn theo Prometheus vLLM metrics
│   │   │   └── pdb.yaml                    # PodDisruptionBudget minAvailable: 1
│   │   └── overlays/                       # Kustomize overlays theo từng môi trường
│   │       ├── dev/
│   │       └── prod/
│   ├── helm/                               # Đóng gói Helm Charts doanh nghiệp
│   └── terraform/                          # Khởi tạo tài nguyên đám mây AWS / GCP
│       ├── main.tf                         # VPC, EKS/GKE Cluster, S3 Bucket
│       └── variables.tf
│
├── monitoring/                             # Khả năng quan sát toàn diện (Observability Tier)
│   ├── prometheus/                         # Thu thập chỉ số định lượng
│   │   ├── prometheus.yml                  # Cào metrics từ vLLM, FastAPI, Redis, Qdrant
│   │   └── alerts.yml                      # Cảnh báo vi phạm SLO (P95 Latency > 1.5s)
│   ├── grafana/                            # Bảng điều khiển trực quan thời gian thực
│   │   ├── dashboards/                     # Xuất bản file JSON bảng điều khiển
│   │   │   ├── llm_serving_metrics.json    # Đo TTFT, TPOT, ITL, VRAM Cache Usage
│   │   │   ├── agent_finops_costs.json     # Đo chi phí $/1M tokens và Unit Economics
│   │   │   └── reliability_breakers.json   # Trạng thái Circuit Breaker (CLOSED/OPEN)
│   │   └── provisioning/
│   └── opentelemetry/                      # Thu thập dấu vết phân tán (Distributed Tracing)
│       └── otel-collector-config.yaml      # Nhận OTLP Spans đẩy sang Jaeger & LangSmith
│
├── data/                                   # Lưu trữ dữ liệu & Trạng thái phân tầng
│   ├── raw/                                # Dữ liệu thô ban đầu (PDFs, Markdown, Scans)
│   ├── lakehouse/                          # Kiến trúc Medallion Lakehouse (ACID)
│   │   ├── bronze/                         # Bản ghi nguyên thủy gắn timestamp & UUID
│   │   ├── silver/                         # Dữ liệu đã làm sạch PII, bóc tách cấu trúc
│   │   └── gold/                           # Tri thức hoàn thiện đã enrich metadata
│   ├── embeddings/                         # Vector indices lưu offline / snapshot
│   └── audit_store/                        # Sổ cái SQLite3 append-only ghi nhận quyết định
│
├── evals/                                  # Khung kiểm định chất lượng AI độc lập (Track 1 & 3)
│   ├── datasets/                           # Bộ dữ liệu kiểm thử chuẩn hóa (Gold Datasets)
│   │   ├── golden_test_set_50q.jsonl       # 50 câu hỏi phủ kín ma trận In/Out/Ambiguous
│   │   ├── adversarial_attacks_20.jsonl    # 20 kịch bản Jailbreak & Indirect Injection
│   │   └── human_labeled_baselines.csv     # Nhãn chấm tay của chuyên gia để tính Cohen κ
│   ├── prompts/                            # Quản lý phiên bản Prompt Thẩm phán (Judge Hub)
│   │   ├── judge_faithfulness_v1.md        # Prompt chấm điểm trung thực không ảo giác
│   │   └── judge_pedagogy_v2.md            # Prompt chấm chuẩn mực sư phạm / nghiệp vụ
│   ├── metrics/                            # Công thức đo đạc thống kê độc lập
│   │   ├── agreement.py                    # Tính toán chỉ số Cohen's Kappa (κ ≥ 0.81)
│   │   ├── ragas_evaluator.py              # Đo 4 chỉ số RAGAS (Context Recall/Precision...)
│   │   └── latency_profiler.py             # Phân rã TTFT (Compute) vs TPOT (Memory)
│   ├── runners/                            # Script thực thi kiểm định hàng loạt
│   │   └── run_benchmark.py                # Chạy đối soát song song và sinh Confusion Matrix
│   └── reports/                            # Kết xuất báo cáo HTML / Markdown tự động
│
├── notebooks/                              # Khu vực nghiên cứu, thí nghiệm (R&D Playground)
│   ├── 01_problem_discovery_eda.ipynb      # Phân tích dữ liệu ban đầu & kiểm tra giả thuyết
│   ├── 02_hybrid_retrieval_tuning.ipynb    # Thử nghiệm trọng số RRF (Dense vs BM25)
│   ├── 03_prompt_calibration.ipynb         # Tinh chỉnh Few-shot Prompting với LangSmith
│   └── 04_finetuning_lora_analysis.ipynb   # Phân tích Loss và kiểm tra Beating Base Model
│
├── src/                                    # MÃ NGUỒN CỐT LÕI HỆ THỐNG (PRODUCTION AI SOURCE)
│   │
│   ├── core/                               # Hạt nhân cấu hình & tiện ích dùng chung
│   │   ├── __init__.py
│   │   ├── config.py                       # Pydantic Settings v2 nạp biến môi trường (.env)
│   │   ├── constants.py                    # Hằng số bất biến (HTTP timeouts, Model IDs)
│   │   ├── exceptions.py                   # Cây ngoại lệ phân cấp chuẩn doanh nghiệp
│   │   └── logging.py                      # JSON structured logger có correlation trace ID
│   │
│   ├── ingestion/                          # Động cơ tiếp nhận & tiền xử lý tài liệu thông minh
│   │   ├── __init__.py
│   │   ├── document_parser.py              # Bóc tách định dạng PDF, Docx, Markdown, Scans
│   │   ├── hierarchical_chunker.py         # Phân rã văn bản chuẩn Nghị định 30/2020/NĐ-CP
│   │   ├── zero_width_scrubber.py          # Tiêu hủy ký tự tàng hình [\u200b-\u200f\ufeff]
│   │   └── pii_sanitizer.py                # Ẩn danh hóa CCCD, SĐT, Email chuẩn Nghị định 13
│   │
│   ├── retrieval/                          # Động cơ tìm kiếm tri thức chuyên sâu đa phương thức
│   │   ├── __init__.py
│   │   ├── dense_embedder.py               # Sinh vector ngữ nghĩa (BAAI/bge-m3 / text-embedding-3)
│   │   ├── qdrant_hybrid.py                # Tìm kiếm lai Qdrant (Dense + BM25 Sparse theo RRF)
│   │   ├── graphrag_engine.py              # Truy vấn đồ thị tri thức Neo4j Cypher Traversal
│   │   └── cross_encoder_reranker.py       # Tái xếp hạng bge-reranker-v2-m3 triệt tiêu Lost-in-the-Middle
│   │
│   ├── agents/                             # Bộ não tác tử & đồ thị suy luận (LangGraph Orchestration)
│   │   ├── __init__.py
│   │   ├── state.py                        # State DTO bất biến kế thừa TypedDict (Correlation ID, Messages)
│   │   ├── supervisor.py                   # Tác tử điều phối phân tích ý định (Intent Routing)
│   │   ├── legal_researcher.py             # Tác tử chuyên viên tra cứu điều luật & án lệ
│   │   ├── risk_analyst.py                 # Tác tử kiểm định rủi ro (Điều 301 trần phạt 8%)
│   │   ├── critic_reviewer.py              # Tác tử phản biện độc lập (Reflection & Fact-checking)
│   │   ├── debate_arena.py                 # Hội đồng tranh luận Agent-to-Agent (A2A Arbitration)
│   │   ├── tools/                          # Danh mục công cụ của tác tử (MCP Tools, Web Search)
│   │   └── graph_builder.py                # Dựng StateGraph, Conditional Edges & Human-in-the-loop
│   │
│   ├── harness/                            # Pháo đài ổn định & phòng thủ chủ động (Reliability & Safety)
│   │   ├── __init__.py
│   │   ├── circuit_breaker.py              # Cỗ máy trạng thái 3 pha (CLOSED, OPEN, HALF_OPEN)
│   │   ├── retry_policy.py                 # Exponential Backoff kết hợp Full Jitter
│   │   ├── semantic_cache.py               # Bộ nhớ đệm vector Redis (Cosine >= 0.95, 4ms, $0)
│   │   ├── fallback_ladder.py              # Thang cứu hộ 5 bậc (SoTA -> Backup -> Local -> Static)
│   │   ├── quality_guardrail.py            # Chặn đứng Silent Failure nếu Faithfulness < 0.70
│   │   └── ast_code_sandbox.py             # Quét AST chặn exec(), eval(), os.system trong code sinh ra
│   │
│   ├── finops/                             # Động cơ quản trị tài chính & tối ưu chi phí LLM
│   │   ├── __init__.py
│   │   ├── token_sentinel.py               # Giám sát hạn mức token, tự cắt đuôi ReAct loops
│   │   ├── cost_calculator.py              # Tính toán $/1M tokens và Unit Economics theo vai trò
│   │   └── duckdb_ledger.py                # Sổ cái giao dịch In-Process DuckDB quét Parquet logs
│   │
│   ├── observability/                      # Khả năng quan sát & truy vết toàn diện hệ thống
│   │   ├── __init__.py
│   │   ├── tracer.py                       # Thiết lập OpenTelemetry 11 Spans W3C traceparent
│   │   ├── prometheus_exporter.py          # Cào metrics vLLM (queue size, ITL, TTFT, cache usage)
│   │   └── langsmith_tracker.py            # Đồng bộ dấu vết suy luận lên LangSmith Dashboard
│   │
│   └── api/                                # Cổng giao tiếp đa phương thức phục vụ client & MCP
│       ├── __init__.py
│       ├── dependencies.py                 # Dependency Injection (Auth, Rate Limit, DB pool)
│       ├── middlewares.py                  # W3C Traceparent propagation, Global Error Interceptor
│       ├── routes/                         # Danh mục Endpoint định tuyến
│       │   ├── health.py                   # Deep Healthcheck: /ready, /degraded, /not_ready
│       │   ├── audit.py                    # Endpoint kiểm toán hợp đồng & phân tích rủi ro
│       │   ├── stream.py                   # Server-Sent Events (SSE) Streaming Thought Stream
│       │   └── ingest.py                   # Tiếp nhận tài liệu tải lên xử lý bất đồng bộ
│       ├── mcp/                            # Cổng Model Context Protocol Server (JSON-RPC 2.0)
│       │   ├── server.py                   # MCP Server Stdio / SSE Transport
│       │   └── tools_registry.py           # Công bố Tools & Resources chuẩn hóa cho Cursor/Claude
│       ├── cli/                            # Giao diện dòng lệnh vận hành Admin
│       │   └── manage.py                   # Lệnh CLI: db seed, run eval, benchmark
│       └── main.py                         # Entrypoint khởi chạy ứng dụng FastAPI (Lifespan)
│
├── tests/                                  # HỆ THỐNG KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (AUTOMATED TESTS)
│   ├── conftest.py                         # Cấu hình Pytest fixtures (Mock LLM, Test DB, Mock API)
│   ├── unit/                               # Kiểm thử đơn vị (Chạy cực nhanh < 10 giây)
│   │   ├── domain/                         # Kiểm thử logic toán học và luật nghiệp vụ thuần túy
│   │   ├── security/                       # Kiểm thử bộ lọc PII, AST Scanner, Zero-Width
│   │   └── reliability/                    # Kiểm thử Circuit Breaker State Machine, Cache
│   ├── integration/                        # Kiểm thử tích hợp giữa các tầng và vi dịch vụ
│   │   ├── test_qdrant_retrieval.py        # Kiểm thử truy vấn thực tế trên cụm Qdrant Test
│   │   ├── test_delta_lake_merge.py        # Kiểm thử tính lũy biến (Idempotency MERGE)
│   │   └── test_vllm_connection.py         # Kiểm thử tương thích chuẩn OpenAI Completion
│   ├── e2e/                                # Kiểm thử toàn trình (End-to-End User Journeys)
│   │   ├── test_contract_audit_flow.py     # Giả lập người dùng upload PDF đến khi nhận kết quả
│   │   └── test_degraded_recovery.py       # Giả lập rút mạng Redis/Qdrant kiểm tra chế độ fallback
│   └── chaos/                              # Kỹ nghệ hỗn loạn (Chaos Engineering Drills)
│       └── test_kill_services.py           # Bắn tín hiệu SIGKILL/SIGSTOP đo đạc RTO/RPO clock
│
├── scripts/                                # Kịch bản tiện ích vận hành & bảo trì (DevOps Scripts)
│   ├── setup_dev_env.sh                    # Khởi tạo venv, cài đặt pre-commit, nạp models
│   ├── seed_database.py                    # Nạp dữ liệu mẫu ban đầu cho Qdrant và Delta Lake
│   ├── run_security_scan.sh                # Quét lỗ hổng bảo mật Bandit & Safety
│   └── generate_compliance_report.py       # Xuất chứng chỉ tuân thủ EU AI Act & Nghị định 13
│
├── docs/                                   # Tài liệu kiến trúc, hướng dẫn & đặc tả hệ thống
│   ├── architecture/                       # Sơ đồ kiến trúc chi tiết (Mermaid, Draw.io)
│   │   ├── c4_system_context.md            # C4 Model Level 1: System Context Diagram
│   │   ├── c4_container_diagram.md         # C4 Model Level 2: Container Topology
│   │   └── sequence_audit_flow.md          # Biểu đồ tuần tự luồng kiểm toán thời gian thực
│   ├── runbooks/                           # Cẩm nang xử lý sự cố trực vận hành (SRE Runbooks)
│   │   ├── high_latency_triage.md          # Quy trình xử lý khi TTFT tăng vọt
│   │   └── circuit_breaker_trip.md         # Quy trình can thiệp khi cầu dao nhảy OPEN
│   └── api_specs/                          # Đặc tả giao diện OpenAPI (Swagger) & MCP JSON Specs
│
├── .dockerignore                           # Danh sách loại trừ khi đóng gói Docker Container
├── .env.example                            # Bản mẫu khai báo biến môi trường (KHÔNG CHỨA SECRET)
├── .gitignore                              # Danh sách loại trừ khỏi Git (logs, venv, caches, db)
├── .pre-commit-config.yaml                 # Chốt chặn kiểm tra tự động trước mỗi lần Git Commit
├── Makefile                                # Bộ điều khiển tự động hóa các lệnh vận hành chuẩn
├── pyproject.toml                          # Cấu hình trung tâm: Dependencies, Ruff, Mypy, Pytest
└── README.md                               # Cẩm nang tổng quan dự án, hướng dẫn cài đặt & bàn giao
```

---

# 3. GIẢI PHẪU CHI TIẾT 10 PHÂN KHU CHỨC NĂNG CỐT TỬ

## 3.1. Phân khu 1: `configs/` & `src/core/` — Quản Trị Cấu Hình Đa Môi Trường & Hạt Nhân Nền Tảng

Một dự án AI chuẩn sản xuất tuyệt đối không bao giờ được hard-code các thông số như `max_tokens = 2048`, `temperature = 0.2`, hay URL máy chủ trong mã nguồn logic.  
- **Thư mục `configs/`:** Chứa các tệp YAML khai báo tham số cho từng môi trường riêng biệt:
  - `development.yaml`: Sử dụng mô hình giả lập (Mock LLM) hoặc mô hình nhỏ trên CPU, SQLite local để lập trình viên có thể viết code và chạy test tức thì mà không cần GPU.
  - `staging.yaml`: Kết nối tới cụm máy chủ kiểm thử dùng chung, đo đạc hiệu năng với tải nhỏ.
  - `production.yaml`: Cấu hình toàn bộ địa chỉ cụm vLLM GPU Cluster, Redis Sentinel, Delta Lake trên S3, và thiết lập ngưỡng timeout/concurrency tối đa.
  - `tool_manifest.yaml`: Khai báo quyền hạn công cụ & danh mục Denied Capabilities bị cấm thực thi.
- **Mô hình Pydantic Settings v2 (`src/core/config.py`):** Đọc cấu hình từ YAML, kết hợp ghi đè (override) bởi các biến môi trường hệ thống (`.env` hoặc Kubernetes Secrets), thực hiện ép kiểu và kiểm tra tính hợp lệ dữ liệu ngay khi khởi động (Fail-Fast at Startup). Nếu thiếu khóa bí mật hoặc sai kiểu số liệu, ứng dụng sẽ từ chối khởi chạy và báo lỗi rõ ràng thay vì nổ lỗi ngầm giữa chừng.
- **Tiện ích cốt lõi (`src/core/`):** Cung cấp các hằng số bất biến (`constants.py`), cây ngoại lệ phân cấp (`exceptions.py`) và hệ thống ghi log JSON có gắn correlation trace ID (`logging.py`).

---

## 3.2. Phân khu 2: `src/ingestion/` — Tiếp Nhận Dữ Liệu, Cắt Phân Cấp Nghị Định 30 & Làm Sạch PII

Phân khu chịu trách nhiệm chuẩn hóa mọi dữ liệu đầu vào thành các đoạn ngữ cảnh chất lượng cao:
- **`document_parser.py`:** Bóc tách đa định dạng (PDF đa cột, scan OCR, Markdown, văn bản hành chính) giữ nguyên cấu trúc tiêu đề, bảng biểu.
- **`hierarchical_chunker.py`:** Phân rã văn bản có cấu trúc theo chuẩn thể thức văn bản hành chính **Nghị định 30/2020/NĐ-CP** (Phần $\to$ Chương $\to$ Mục $\to$ Điều $\to$ Khoản $\to$ Điểm), bảo toàn nguyên vẹn ngữ cảnh pháp lý và liên kết cha-con (Small-to-Big Chunks).
- **`zero_width_scrubber.py`:** Quét sạch toàn bộ các ký tự Unicode tàng hình (`\u200b`, `\u200c`, `\u200d`, `\ufeff`) mà hacker sử dụng để che giấu các lệnh Prompt Injection xuyên thủng bộ lọc.
- **`pii_sanitizer.py`:** Nhận diện và che giấu tự động Số Căn cước công dân (12 số), Số điện thoại Việt Nam, Số thẻ ngân hàng, bảo đảm tuân thủ $100\%$ quy định của **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân.

---

## 3.3. Phân khu 3: `src/retrieval/` — Tìm Kiếm Lai Đa Tầng (Qdrant Dense/BM25, GraphRAG & Cross-Encoder)

Động cơ cung cấp tri thức chính xác, triệt tiêu ảo giác cho các tác tử suy luận:
- **`dense_embedder.py`:** Sinh vector biểu diễn ngữ nghĩa dày với mô hình chuyên biệt đa ngôn ngữ (BAAI/bge-m3 hoặc text-embedding-3).
- **`qdrant_hybrid.py`:** Thực thi tìm kiếm lai (Hybrid Search) trên Vector DB Qdrant, kết hợp Dense Semantic Vector và Sparse Lexical (BM25) qua thuật toán **Reciprocal Rank Fusion (RRF)**.
- **`graphrag_engine.py`:** Truy vấn đồ thị tri thức trên Neo4j bằng ngôn ngữ Cypher và duyệt đồ thị BFS Traversal, giải quyết các câu hỏi liên kết đa thực thể phức tạp mà vector search thông thường bỏ sót.
- **`cross_encoder_reranker.py`:** Tái xếp hạng kết quả với mô hình Cross-Encoder (BAAI/bge-reranker-v2-m3), đưa các tài liệu có độ tương thích cao nhất lên đầu cửa sổ ngữ cảnh, triệt tiêu hiện tượng "Lost-in-the-Middle".

---

## 3.4. Phân khu 4: `src/agents/` — Kiến Trúc Tác Tử Thông Minh, LangGraph & Hội Đồng Phản Biện A2A

Nơi hiện thực hóa bộ não suy luận có cấu trúc của hệ thống thông qua đồ thị trạng thái:
- **`state.py`:** Định nghĩa **State DTO bất biến** kế thừa TypedDict, đảm bảo tính nhất quán của dữ liệu luân chuyển giữa các node (Messages, Context, Artifacts, Correlation ID).
- **`supervisor.py`:** Node Tác tử Điều phối viên, phân tích ý định người dùng (Intent Routing) và lập kế hoạch điều phối tác vụ cho các chuyên gia.
- **`legal_researcher.py` & `risk_analyst.py`:** Các tác tử chuyên môn sâu, tra cứu văn bản quy phạm pháp luật và đối chiếu điều khoản (Ví dụ: kiểm tra trần phạt 8% theo Điều 301 Luật Thương mại 2005).
- **`critic_reviewer.py` & `debate_arena.py`:** Cơ chế phản biện độc lập (Reflection) và Hội đồng tranh luận Tác tử với Tác tử (Agent-to-Agent Arbitration) nhằm phát hiện mâu thuẫn, sửa chữa sai lệch và loại bỏ hoàn toàn nhận định ảo giác.
- **`graph_builder.py`:** Khởi tạo đồ thị có hướng StateGraph, thiết lập các cạnh điều kiện (Conditional Edges) và chốt chặn phê duyệt của con người (Human-in-the-Loop).

---

## 3.5. Phân khu 5: `src/harness/` — Pháo Đài Bền Vững (Cầu Dao 3 Pha, Fallback Ladder, Semantic Cache & AST Sandbox)

Bảo chứng cho cam kết hoạt động liên tục $99.9\%$ (Zero-Crash Guarantee) và an toàn tuyệt đối:
- **`circuit_breaker.py`:** Cỗ máy trạng thái 3 pha (`CLOSED` $\leftrightarrow$ `OPEN` $\leftrightarrow$ `HALF_OPEN`) ngắt mạch tức thì trong $0.1$ms khi dịch vụ ngoài bị lỗi liên tiếp $\ge 3$ lần, bảo vệ hệ thống khỏi nghẽn mạng và bão request.
- **`semantic_cache.py`:** Bộ nhớ đệm ngữ nghĩa trên Redis. Câu hỏi có độ tương đồng ngữ nghĩa $\ge 0.95$ sẽ được trả về ngay trong $4$ms, tiêu tốn đúng **$0$ token GPU và $0$ đồng chi phí**.
- **`fallback_ladder.py`:** Thang cứu hộ 5 bậc tự động chuyển hướng khi mô hình chính gặp sự cố: *Mô hình Đỉnh cao $\to$ Cụm On-Premise nội bộ $\to$ Mô hình Nhẹ siêu tốc $\to$ Semantic Cache $\to$ Câu thông báo an toàn định sẵn*.
- **`quality_guardrail.py`:** Đo đạc chỉ số Faithfulness theo thời gian thực; nếu điểm số $< 0.70$, tự động chặn câu trả lời và kích hoạt chu trình tự sửa chữa.
- **`ast_code_sandbox.py`:** Phân tích Cây Cú Pháp Trừu Tượng (`ast.parse`) của mọi đoạn mã Python do Tác tử tự động sinh ra trước khi chạy, chặn tuyệt đối các lệnh nguy hiểm (`os.system`, `subprocess`, `eval`, `__import__`).

---

## 3.6. Phân khu 6: `src/finops/` — Giám Sát Chi Phí Token, Độ Trễ TTFT & Động Cơ DuckDB In-Process OLAP

Quản trị tài chính và đơn vị kinh tế (Unit Economics) cho toàn bộ hệ thống AI:
- **`token_sentinel.py`:** Giám sát trần ngân sách token theo từng phiên làm việc, tự động cắt đuôi các vòng lặp ReAct loop vô tận để bảo vệ tài khoản.
- **`cost_calculator.py`:** Tính toán chi tiết chi phí suy luận ($/1M tokens) cho từng vai trò tác tử, phân bổ ngân sách theo từng kịch bản nghiệp vụ.
- **`duckdb_ledger.py`:** Động cơ phân tích OLAP In-Process DuckDB quét trực tiếp các tệp Parquet log, trích xuất báo cáo kinh tế: Chi phí trung bình trên mỗi hợp đồng thẩm định (Cost-per-Job), tỷ lệ cache-hit tiết kiệm ngân sách theo thời gian thực.

---

## 3.7. Phân khu 7: `src/observability/` — Chuỗi Dấu Vết 11 Spans OpenTelemetry & Chỉ Số Sống Còn Prometheus

Đôi mắt và đôi tai của hệ thống vận hành sản xuất:
- **`tracer.py`:** Thu thập chuỗi 11 Spans phân tán chuẩn W3C `traceparent` xuyên qua toàn bộ hành trình (Gateway $\to$ Ingestion $\to$ Qdrant $\to$ LangGraph Agents $\to$ vLLM $\to$ Guardrails), hỗ trợ đồng bộ sang Jaeger và LangSmith.
- **`prometheus_exporter.py`:** Thu thập các số liệu sống còn của cụm GPU vLLM (`vllm:num_requests_waiting`, `vllm:gpu_cache_usage_factor`), tỷ lệ trúng Semantic Cache và trạng thái Circuit Breaker.
- **`langsmith_tracker.py`:** Đồng bộ chi tiết từng bước suy luận, câu hỏi, câu trả lời và điểm số đánh giá phục vụ gỡ lỗi và cải tiến mô hình.

---

## 3.8. Phân khu 8: `src/api/` — Cổng Phục Vụ Đa Giao Thức (FastAPI SSE Streaming, CLI & Anthropic MCP Server)

Nơi hệ thống mở cửa phục vụ người dùng cuối và các công cụ AI khác:
- **FastAPI Core Gateway (`src/api/main.py`):** Quản lý vòng đời ứng dụng bằng `lifespan` context manager, kiểm tra deep healthcheck (`/ready`, `/degraded`, `/not_ready`), nạp middleware bảo mật và W3C Traceparent propagation.
- **`routes/stream.py`:** Hỗ trợ **Server-Sent Events (SSE) Streaming** truyền tải từng token và luồng suy nghĩ của tác tử (Thought Stream) theo thời gian thực.
- **Cổng giao tiếp MCP (`src/api/mcp/`):** Máy chủ **Model Context Protocol (Anthropic MCP Server)** chuẩn hóa qua JSON-RPC 2.0 (Stdio / SSE), cho phép Cursor, Claude Desktop hoặc IDEs cắm rút trực tiếp kho tri thức và công cụ kiểm toán của hệ thống.
- **CLI Quản trị (`src/api/cli/manage.py`):** Công cụ dòng lệnh thực thi tác vụ bảo trì: di chuyển dữ liệu, seed data, chạy eval benchmark.

---

## 3.9. Phân khu 9: `evals/` — Khung Đánh Giá Độc Lập, Golden Datasets & Calibrated Judge

Nền tảng kiểm định định lượng chất lượng sản phẩm AI (Track 1 & Track 3):
- **`datasets/`:** Chứa tập câu hỏi chuẩn vàng (Golden Test Sets) phân bổ theo ma trận bao phủ: In-scope, Out-of-scope, Ambiguous, và 20 kịch bản tấn công đối kháng Red Teaming.
- **`metrics/agreement.py`:** Thuật toán tính toán **Hệ số Đồng thuận Cohen's Kappa ($\kappa$)** đối soát giữa AI Judge và chuyên gia con người. Sản phẩm chỉ được cấp phép phát hành khi $\kappa \ge 0.81$.
- **`runners/run_benchmark.py`:** Tự động chạy toàn bộ pipeline, tính toán chi phí, độ trễ P50/P95/P99, và xuất bảng báo cáo Markdown/HTML phục vụ hội đồng nghiệm thu.

---

## 3.10. Phân khu 10: `deploy/` & `.github/` — DevOps, Dockerfile Multi-stage & CI/CD Pipeline

Hạ tầng tự động hóa triển khai không gián đoạn (Zero-Downtime Deployment):
- **`deploy/docker/Dockerfile.app`:** Áp dụng kỹ thuật Multi-stage Build: Stage 1 build bánh xe dependencies; Stage 2 chỉ copy binary sạch và chạy dưới quyền `non-root user`, tối ưu kích thước image $< 250$MB và triệt tiêu lỗ hổng bảo mật.
- **`.github/workflows/ci-quality-gate.yml`:** Cổng kiểm soát chất lượng 4 bước bắt buộc trước khi Merge code:
  1. *Linter & Formatter:* Ruff kiểm tra cú pháp và định dạng mã nguồn.
  2. *Type Checker:* Mypy ở chế độ `strict` bảo đảm 100% biến có kiểu dữ liệu rõ ràng.
  3. *Unit & Security Tests:* Pytest chạy toàn bộ bài test an ninh và logic nghiệp vụ.
  4. *Regression Eval Gate:* Chạy kiểm tra Golden Dataset, nếu điểm trung thực giảm $> 2\%$ thì tự động khóa Pull Request.

---

# 4. BỘ MÃ NGUỒN KHUNG CHUẨN MỰC (PRODUCTION BOILERPLATES)

Dưới đây là mã nguồn hoàn chỉnh của các tệp hạt nhân cốt lõi nhất, sẵn sàng đưa vào vận hành ngay lập tức.

## 4.1. Quản lý Thư viện Hiện đại: `pyproject.toml` (Poetry/Uv, Ruff, Mypy Strict)

```toml
[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"

[tool.poetry]
name = "enterprise-ai-platform"
version = "2.0.0"
description = "Production-grade Enterprise AI Platform with Resilient Harness and LLMOps"
authors = ["VinAI AI20K Engineering Team <engineering@vinai.io>"]
readme = "README.md"
packages = [{include = "src"}]

[tool.poetry.dependencies]
python = "^3.11"
pydantic = "^2.8.0"
pydantic-settings = "^2.3.0"
fastapi = "^0.111.0"
uvicorn = {extras = ["standard"], version = "^0.30.0"}
langgraph = "^0.2.0"
langchain-core = "^0.2.0"
qdrant-client = "^1.9.0"
redis = "^5.0.0"
duckdb = "^1.0.0"
opentelemetry-api = "^1.25.0"
opentelemetry-sdk = "^1.25.0"
opentelemetry-instrumentation-fastapi = "^0.46b0"
httpx = "^0.27.0"
pyyaml = "^6.0.1"

[tool.poetry.group.dev.dependencies]
pytest = "^8.2.0"
pytest-asyncio = "^0.23.0"
pytest-cov = "^5.0.0"
ruff = "^0.5.0"
mypy = "^1.10.0"
bandit = "^1.7.9"

[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "I", "N", "W", "B", "S", "PT"]
ignore = ["B008"] # Cho phép Depends trong FastAPI

[tool.mypy]
python_version = "3.11"
strict = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
ignore_missing_imports = true

[tool.pytest.ini_options]
minversion = "8.0"
addopts = "-ra -q --cov=src --cov-report=term-missing"
testpaths = ["tests"]
asyncio_mode = "auto"
```

---

## 4.2. Quản trị Cấu hình Bất biến: `src/core/config.py` (Pydantic Settings v2)

```python
"""
Core Configuration Module using Pydantic Settings v2.
Guarantees immutability and environment-variable validation at application startup.
"""
from enum import Enum
from pathlib import Path
from typing import List, Optional
from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentType(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    # Base Info
    PROJECT_NAME: str = "Enterprise AI Resilient Platform"
    ENVIRONMENT: EnvironmentType = EnvironmentType.DEVELOPMENT
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(..., min_length=32, description="HMAC Secret Key")

    # Serving & Models
    PRIMARY_MODEL_NAME: str = "Qwen/Qwen2.5-7B-Instruct"
    VLLM_ENDPOINT: HttpUrl = Field("http://vllm-serving:8001/v1")
    FALLBACK_MODEL_NAME: str = "gemini-1.5-flash"
    MAX_TOKENS: int = 2048
    TEMPERATURE: float = 0.2

    # Storage & Cache Substrates
    REDIS_URL: str = Field("redis://redis-cluster:6379/0")
    QDRANT_HOST: str = "qdrant-node"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "enterprise_knowledge"
    DELTA_LAKE_PATH: Path = Path("/data/lakehouse/audit_ledger")

    # Reliability & Guardrail Thresholds
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 3
    CIRCUIT_BREAKER_RECOVERY_TIMEOUT: float = 5.0
    SEMANTIC_CACHE_THRESHOLD: float = 0.95
    MIN_FAITHFULNESS_SCORE: float = 0.70

    # CORS & Security
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    ENABLE_AST_SANDBOX: bool = True
    REDACT_PII: bool = True


# Khởi tạo singleton cấu hình cho toàn ứng dụng
settings = Settings()
```

---

## 4.3. Gateway FastAPI Chuẩn Doanh Nghiệp: `src/api/main.py` (Lifespan, OTel, SSE)

```python
"""
Enterprise FastAPI Gateway Entrypoint.
Features: Lifespan Context Manager, OpenTelemetry Tracing, SSE Streaming, Global Error Handlers.
"""
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from src.core.config import settings
from src.core.telemetry import setup_telemetry
from src.core.exceptions import AIServiceException, SecurityViolationException

logger = logging.getLogger("api.gateway")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động: Thiết lập OpenTelemetry, kiểm tra kết nối DB & Serving
    logger.info("Khởi động nền tảng AI: Đang nạp cấu hình và kết nối hạ tầng...")
    setup_telemetry(app, service_name=settings.PROJECT_NAME)
    # Yield quyền thực thi cho ứng dụng
    yield
    # Dọn dẹp tài nguyên khi tắt server
    logger.info("Đang giải phóng các connection pools và tắt gateway an toàn...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AIServiceException)
async def ai_service_exception_handler(request: Request, exc: AIServiceException):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error_code": exc.error_code, "message": exc.message}
    )


@app.exception_handler(SecurityViolationException)
async def security_violation_handler(request: Request, exc: SecurityViolationException):
    logger.critical(f"CẢNH BÁO BẢO MẬT: {exc.message} | Client: {request.client.host}")
    return JSONResponse(
        status_code=status.HTTP_403_FORBIDDEN,
        content={"error_code": "SECURITY_VIOLATION", "message": "Yêu cầu bị từ chối do vi phạm an ninh."}
    )


@app.get("/health/ready", tags=["Healthcheck"])
async def deep_healthcheck():
    """Kiểm tra độ sẵn sàng của toàn bộ hạ tầng (Substrate Deep Check)."""
    return {
        "status": "ready",
        "environment": settings.ENVIRONMENT,
        "model_endpoint": str(settings.VLLM_ENDPOINT),
        "circuit_breaker": "CLOSED"
    }


@app.post(f"{settings.API_V1_STR}/chat/stream", tags=["Agent Inference"])
async def stream_agent_reasoning(request: Request):
    """Server-Sent Events (SSE) Streaming trả về Thought Stream của Tác tử."""
    async def event_generator() -> AsyncGenerator[str, None]:
        # Giả lập stream suy luận từng bước (ReAct Thought Flow)
        steps = [
            '{"step": "INTENT", "data": "Phân tích câu hỏi người dùng..."}',
            '{"step": "RETRIEVAL", "data": "Truy xuất Qdrant Hybrid bge-m3..."}',
            '{"step": "VALIDATION", "data": "Kiểm tra trần phạt 8% Điều 301..."}',
            '{"step": "FINAL", "data": "Hoàn tất kiểm toán rủi ro hợp đồng."}'
        ]
        for step in steps:
            yield {"event": "agent_thought", "data": step}

    return EventSourceResponse(event_generator())
```

---

## 4.4. Cỗ Máy Cầu Dao Tự Động 3 Pha: `src/harness/circuit_breaker.py`

```python
"""
Thread-safe 3-Phase Circuit Breaker State Machine.
Protects downstream AI and vector services against cascading failures.
"""
import time
import threading
from enum import Enum
import logging

logger = logging.getLogger("harness.circuit_breaker")


class BreakerState(str, Enum):
    CLOSED = "CLOSED"      # Hoạt động bình thường
    OPEN = "OPEN"          # Ngắt mạch, fast-fail ngay lập tức
    HALF_OPEN = "HALF_OPEN"# Hé mở cho 1 request thử nghiệm


class CircuitOpenError(Exception):
    """Ngoại lệ ném ra khi cầu dao đang ở trạng thái ngắt."""
    pass


class ProductionCircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        recovery_timeout: float = 5.0,
        success_threshold: int = 2
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self._state = BreakerState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_state_change = time.time()
        self._lock = threading.Lock()

    @property
    def state(self) -> BreakerState:
        with self._lock:
            self._evaluate_state()
            return self._state

    def _evaluate_state(self) -> None:
        """Kiểm tra chuyển trạng thái từ OPEN sang HALF_OPEN khi hết timeout."""
        now = time.time()
        if self._state == BreakerState.OPEN and (now - self._last_state_change >= self.recovery_timeout):
            logger.warning(f"Cầu dao [{self.name}]: Hết timeout {self.recovery_timeout}s ──► Chuyển sang HALF_OPEN để thăm dò.")
            self._state = BreakerState.HALF_OPEN
            self._last_state_change = now

    def allow_request(self) -> bool:
        """Kiểm tra có cho phép request đi tiếp hay không."""
        with self._lock:
            self._evaluate_state()
            if self._state == BreakerState.OPEN:
                return False
            return True

    def record_success(self) -> None:
        """Ghi nhận lượt gọi thành công."""
        with self._lock:
            if self._state == BreakerState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    logger.info(f"Cầu dao [{self.name}]: Đã thành công {self._success_count} lần liên tiếp ──► ĐÓNG MẠCH (CLOSED).")
                    self._state = BreakerState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
            elif self._state == BreakerState.CLOSED:
                self._failure_count = 0

    def record_failure(self) -> None:
        """Ghi nhận lượt gọi thất bại."""
        with self._lock:
            self._failure_count += 1
            self._last_state_change = time.time()
            logger.error(f"Cầu dao [{self.name}]: Ghi nhận lỗi lần {self._failure_count}/{self.failure_threshold}!")

            if self._state == BreakerState.HALF_OPEN or self._failure_count >= self.failure_threshold:
                logger.critical(f"Cầu dao [{self.name}]: NGẮT MẠCH KHẨN CẤP (OPEN)! Mọi request bị chặn trong {self.recovery_timeout}s.")
                self._state = BreakerState.OPEN
                self._success_count = 0
```

---

## 4.5. Triển Khai Toàn Diện Full-Stack: `docker-compose.yml`

```yaml
version: '3.8'

services:
  # 1. FastAPI Gateway & Application Core
  api-gateway:
    build:
      context: .
      dockerfile: deploy/docker/Dockerfile.app
    container_name: enterprise_ai_api
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - REDIS_URL=redis://redis-cache:6379/0
      - QDRANT_HOST=qdrant-store
      - VLLM_ENDPOINT=http://vllm-serving:8001/v1
    depends_on:
      - redis-cache
      - qdrant-store
    restart: always
    networks:
      - ai-mesh

  # 2. Redis Semantic Cache & Feature Store
  redis-cache:
    image: redis:7.2-alpine
    container_name: enterprise_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - ai-mesh

  # 3. Qdrant Vector Database
  qdrant-store:
    image: qdrant/qdrant:v1.9.0
    container_name: enterprise_qdrant
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - ai-mesh

  # 4. Prometheus Metrics Scraper
  prometheus:
    image: prom/prometheus:v2.52.0
    container_name: enterprise_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - ai-mesh

  # 5. Grafana Real-Time Dashboards
  grafana:
    image: grafana/grafana:10.4.0
    container_name: enterprise_grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=vinai_enterprise_admin
    volumes:
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
    depends_on:
      - prometheus
    networks:
      - ai-mesh

networks:
  ai-mesh:
    driver: bridge

volumes:
  redis_data:
  qdrant_data:
```

---

## 4.6. Tự Động Hóa Vận Hành Dự Án: `Makefile`

```makefile
.PHONY: help install lint typecheck test eval benchmark run-dev docker-up docker-down clean

help: ## Hiển thị danh mục các lệnh vận hành có sẵn
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Cài đặt toàn bộ dependencies môi trường dev
	poetry install --with dev
	poetry run pre-commit install

lint: ## Quét và tự động sửa định dạng code bằng Ruff
	poetry run ruff check src tests evals --fix
	poetry run ruff format src tests evals

typecheck: ## Kiểm tra kiểu dữ liệu nghiêm ngặt với Mypy
	poetry run mypy src

test: ## Chạy toàn bộ kiểm thử tự động (Unit, Integration, Security)
	poetry run pytest tests/ -v --cov=src --cov-report=term-missing

eval: ## Chạy bộ đánh giá Golden Dataset 50 câu & đo Cohen's Kappa
	poetry run python -m evals.runners.run_benchmark

benchmark: ## Đo đạc độ trễ TTFT, TPOT và chi phí FinOps qua DuckDB
	poetry run python -m evals.metrics.latency_profiler

run-dev: ## Khởi chạy FastAPI Server ở môi trường Development
	poetry run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

docker-up: ## Khởi chạy toàn bộ hạ tầng phân tán bằng Docker Compose
	docker compose up -d

docker-down: ## Dừng và giải phóng toàn bộ containers
	docker compose down

clean: ## Dọn dẹp cache, bytecode và tệp tạm
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
```

---

# 5. QUY CHUẨN ĐẶT TÊN, CODE STYLE & QUẢN TRỊ MÔI TRƯỜNG

## 5.1. Quy ước Đặt Tên Tệp, Thư Mục, Lớp & Hàm (PEP 8 + Clean Code)

| Thực thể | Quy chuẩn Định dạng | Ví dụ Chuẩn mực | Dấu hiệu Cấm vi phạm |
|---|---|---|---|
| **Thư mục (Directories)** | `snake_case` (chữ thường, gạch dưới) | `ingestion/`, `retrieval/`, `agents/`, `harness/` | ❌ `SecurityGuardrails`, `reliability-harness` |
| **Mô-đun Python (Files)** | `snake_case.py` | `circuit_breaker.py`, `pydantic_dtos.py` | ❌ `CircuitBreaker.py`, `circuit-breaker.py` |
| **Tên Lớp (Classes)** | `PascalCase` | `ProductionCircuitBreaker`, `LangGraphSupervisor` | ❌ `circuit_breaker`, `production_circuitBreaker`|
| **Tên Hàm & Phương thức** | `snake_case()` (bắt đầu bằng động từ) | `allow_request()`, `verify_code_safety()` | ❌ `AllowRequest()`, `verifyCodeSafety()` |
| **Hằng số (Constants)** | `UPPER_SNAKE_CASE` | `MAX_TOKEN_BUDGET`, `ZERO_WIDTH_REGEX` | ❌ `max_token_budget`, `MaxTokenBudget` |
| **Biến Môi Trường (Env)** | `UPPER_SNAKE_CASE` | `VLLM_ENDPOINT`, `REDIS_CLUSTER_URL` | ❌ `vllmEndpoint`, `redis-url` |

---

## 5.2. Nguyên Tắc Quản Trị Bí Mật (Zero Secrets in Git) & Multi-Environment `.env`

1. **Tuyệt đối không commit tệp `.env` lên Git:** Tệp `.gitignore` phải chứa các mẫu loại trừ:
   ```gitignore
   .env
   .env.*
   !.env.example
   *.db
   *.sqlite3
   secrets/
   ```
2. **Luôn cung cấp `.env.example`:** Mọi biến môi trường cần dùng phải được liệt kê trong `.env.example` kèm chú thích định dạng, nhưng giá trị phải để trống hoặc giá trị mẫu an toàn:
   ```bash
   SECRET_KEY=your_super_secret_hmac_key_here_minimum_32_chars
   OPENAI_API_KEY=sk-proj-placeholder-do-not-commit-real-key
   VLLM_ENDPOINT=http://localhost:8001/v1
   ```
3. **Cài đặt công cụ quét rò rỉ tự động:** Sử dụng `git-secrets` hoặc `trufflehog` trong `.pre-commit-config.yaml` để chặn đứng hành vi commit private key ngay tại máy lập trình viên.

---

## 5.3. Chiến Lược Phân Nhánh Git & Quy Chuẩn Commit (Conventional Commits)

Áp dụng quy chuẩn thông điệp Git chuẩn quốc tế để tự động hóa tạo Release Notes:
- `feat(agent): thêm tác tử phản biện reviewer_critic_node vào LangGraph`
- `fix(security): tiêu hủy ký tự tàng hình zero-width trước khi parse JSON`
- `perf(cache): tối ưu hóa ngưỡng cosine similarity của Redis xuống 0.95`
- `docs(arch): cập nhật sơ đồ C4 Container Diagram trong thư mục docs/`
- `refactor(agents): tối ưu hóa luồng tranh luận đa tác tử trong debate_arena`
- `feat(ingestion): nâng cấp thuật toán cắt phân cấp theo Nghị định 30`

---

# 6. DANH MỤC KIỂM TRA SẢN XUẤT 25 TIÊU CHÍ (PRODUCTION GO-LIVE CHECKLIST)

```
[ ] KHỐI 1: TỔ CHỨC MÃ NGUỒN & CẤU TRÚC (ARCHITECTURE & CODEBASE)
[ ] 01. Mã nguồn tuân thủ AI Pipeline Architecture: Ingestion, Retrieval, Agents, Harness, FinOps, Observability, API.
[ ] 02. Phân tách rành mạch State DTOs, LangGraph Node Functions, Vector Engines và Serving Routers.
[ ] 03. Tệp pyproject.toml cấu hình đầy đủ dependencies và công cụ kiểm tra tĩnh (Ruff, Mypy).
[ ] 04. Mypy chạy ở chế độ strict mode, 100% hàm có type hints cho tham số và kiểu trả về.
[ ] 05. Makefile cung cấp đầy đủ các lệnh chuẩn: install, lint, test, eval, docker-up.

[ ] KHỐI 2: ĐỘ BỀN VỮNG & CHỐNG CHỊU SỰ CỐ (RELIABILITY & RESILIENCE)
[ ] 06. Mọi lời gọi API ngoài (LLM, Embeddings) đều được bảo vệ bởi 3-Phase Circuit Breaker.
[ ] 07. Thiết lập Exponential Backoff kết hợp Full Jitter để triệt tiêu hiện tượng Thundering Herd.
[ ] 08. Semantic Vector Cache hoạt động với ngưỡng Cosine Similarity >= 0.95 (Redis).
[ ] 09. Cài đặt đầy đủ Thang cứu hộ Fallback Ladder 5 bậc, đảm bảo Zero-Crash Guarantee.
[ ] 10. Quality Guardrail tự động ngắt câu trả lời và tự sửa lỗi nếu Faithfulness < 0.70.

[ ] KHỐI 3: AN NINH, QUẢN TRỊ & BẢO MẬT (SECURITY & GOVERNANCE)
[ ] 11. Bộ lọc Zero-Width Unicode tiêu hủy 100% ký tự tàng hình [\u200b-\u200f\ufeff].
[ ] 12. Tự động che giấu Số CCCD, SĐT, Email Tiếng Việt theo Nghị định 13/2023/NĐ-CP.
[ ] 13. Toàn bộ mã nguồn Python do Tác tử sinh ra bắt buộc phải vượt qua AST Syntax Scanner.
[ ] 14. Cổng PEP kiểm soát nghiêm ngặt danh sách Denied Capabilities trong tool_manifest.yaml.
[ ] 15. Tuyệt đối không có API Key hoặc Secret nào bị commit vào Git (.gitignore chuẩn).

[ ] KHỐI 4: ĐÁNH GIÁ CHẤT LƯỢNG & CALIBRATED JUDGE (AI EVALUATION)
[ ] 16. Bộ kiểm định Golden Dataset tối thiểu 50 câu phủ kín ma trận In/Out/Ambiguous.
[ ] 17. Đã đo đạc Hệ số Đồng thuận Cohen's Kappa giữa AI Judge và Chuyên gia đạt κ >= 0.81.
[ ] 18. Có test suite tự động chạy 20 kịch bản đối kháng Red Teaming (Containment >= 95%).
[ ] 19. GitHub Actions tự động chặn Merge nếu điểm benchmark hồi quy (Regression Gate).

[ ] KHỐI 5: KHẢ NĂNG QUAN SÁT & VẬN HÀNH (OBSERVABILITY & OPERATIONS)
[ ] 20. Chuỗi 11 Spans OpenTelemetry truyền xuyên suốt kèm W3C traceparent hợp lệ.
[ ] 21. Dockerfile áp dụng Multi-stage build, non-root user, kích thước container < 250MB.
[ ] 22. Cấu hình Deep Healthcheck phân biệt rõ 3 trạng thái: ready, degraded, not_ready.
[ ] 23. Prometheus cào định kỳ các chỉ số vLLM: queue size, cache usage, TTFT, TPOT.
[ ] 24. Grafana hiển thị trực quan chi phí FinOps $/1M tokens qua In-Process DuckDB.
[ ] 25. Có đầy đủ SRE Runbooks hướng dẫn xử lý khi hệ thống bị chậm hoặc cầu dao bị ngắt.
```

---

> 🏛️ **LỜI KẾT KỸ NGHỆ:**  
> Cấu trúc thư mục này không phải là một công thức lý thuyết trên giấy. Đây là **Khuôn vàng Thước ngọc** được đúc kết từ hàng chục dự án lớn nhỏ của hệ sinh thái VinAI Capstone. Khi tuân thủ chuẩn mực này từ ngày đầu tiên, bạn không chỉ tiết kiệm hàng trăm giờ gỡ lỗi mà còn tự tin đặt sản phẩm của mình lên bất kỳ hạ tầng đám mây nào trên thế giới với độ ổn định và đẳng cấp doanh nghiệp cao nhất.
