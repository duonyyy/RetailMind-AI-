# RetailMind AI — Documentation Package

**Ngày:** 15/10/2026 · **Ngôn ngữ:** tiếng Việt · **Định dạng:** Markdown cho Codex

## Mục đích

Bộ tài liệu này là **đặc tả kỹ thuật hoàn chỉnh cho RetailMind AI** (master prompt và các section đặc tả chi tiết), bao gồm các phân tích chuyên sâu về use case, kiến trúc hệ thống và cơ sở dữ liệu. Mục đích: triển khai RetailMind AI theo Phase 0–9, và **không rời Phase 0 cho đến khi chốt Design Baseline**.

Bản này là **specification và prompt thực thi**, **không phải mã nguồn đã triển khai, không phải xác nhận rằng schema hay test đã chạy**. Use case, ERD và schema trong sections 06/07 là ứng viên thiết kế, cần Codex kiểm tra và người dùng duyệt trước khi khóa baseline.

## Cấu trúc

```text
RetailMind_AI/
├── README.md
├── AGENTS.md                                         # Hiến pháp kỹ thuật vận hành & AI Pair Programming
├── PLANS.md                                          # Kế hoạch tổng thể 10 phases & tiến độ chi tiết
├── RETAILMIND_AI_UNIFIED_CODEX_MASTER_PROMPT.md
├── CHANGELOG.md
├── docs/                                             # Tài liệu kỹ thuật chính thức đã kiểm chứng (Section 01)
│   ├── requirements/                                 # Tầm nhìn sản phẩm, 3 personas, 12 use cases & sơ đồ
│   │   ├── 01_PRODUCT_VISION_AND_SCOPE.md
│   │   ├── actors.md
│   │   ├── use-case-catalog.md
│   │   └── use-case-diagram.md
│   ├── roadmap/                                      # Khóa chặt phạm vi & sổ cái mở rộng tương lai
│   │   └── FUTURE_EXPANSIONS.md
│   ├── research/                                     # 9 tài liệu nghiên cứu chuyên sâu & ma trận bằng chứng
│   │   ├── inventory.md
│   │   ├── evidence-matrix.md
│   │   ├── commerce-flow.md
│   │   ├── agent-tool-flow.md
│   │   ├── rag-flow.md
│   │   ├── security-reliability.md
│   │   ├── evaluation.md
│   │   ├── integration-decisions.md
│   │   └── rejected-patterns.md
│   └── progress/                                     # Báo cáo tiến độ & sổ cái quyết định kỹ thuật
│       ├── PROJECT_STATUS.md
│       └── DECISIONS.md
├── Giao_Trinh/                                       # 9 giáo trình & cẩm nang kiến trúc AI thực chiến
│   ├── README.md                                    # Bản đồ lộ trình học tập & mục lục chi tiết
│   ├── GIAO_TRINH_RAG_TOAN_DIEN_TU_CO_BAN_DEN_PRODUCTION.md
│   ├── GIAO_TRINH_FINE_TUNING_VA_REASONING_TOAN_DIEN.md
│   ├── GIAO_TRINH_AGENTIC_AI_VA_MULTI_AGENT_SYSTEMS_TOAN_DIEN.md
│   ├── GIAO_TRINH_KIEN_TRUC_AI_HARNESS_CHUAN_PRODUCTION.md
│   ├── GIAO_TRINH_AI_SECURITY_GUARDRAILS_VA_GOVERNANCE_TOAN_DIEN.md
│   ├── CAU_TRUC_THU_MUC_DU_AN_AI_CHUAN_PRODUCTION.md
│   ├── HUONG_DAN_KIEN_TRUC_VA_CODE_DO_AN_CUOI_KHOA.md
│   ├── GIAO_TRINH_KIEN_TRUC_AI_CAPSTONE_CHO_SINH_VIEN.md
│   └── agentic_ai_khai_niem_va_vi_du.md
├── prompt_sections/
│   ├── 01_PRODUCT_AND_REFERENCES.md
│   ├── 02_ARCHITECTURE_AND_DOMAIN.md
│   ├── 03_PRIVACY_AND_SECURITY.md
│   ├── 04_PHASE_PLAN.md
│   ├── 05_QUALITY_DOCS_AND_RESUME.md
│   ├── 06_USE_CASE_SPECIFICATION.md
│   └── 07_DATABASE_DESIGN.md
└── templates/
    ├── PHASE0_DESIGN_REVIEW_CHECKLIST.md
    └── PHASE0_SCHEMA_CANDIDATE.sql
```

## Hướng dẫn dùng trên Windows 11 / Codex

1. Giải nén toàn bộ thư mục; **giữ nguyên** cấu trúc `prompt_sections/`.
2. Mở thư mục `RetailMind_AI` trong Codex hoặc đặt toàn bộ nội dung tại root của repo RetailMind bạn muốn triển khai.
3. Yêu cầu Codex đọc `RETAILMIND_AI_UNIFIED_CODEX_MASTER_PROMPT.md` và **tất cả** `prompt_sections/*.md`.
4. Gửi: `EXECUTION_MODE=PHASED` + `START PHASE 0`.
5. Kiểm tra 2 nội dung ưu tiên của Phase 0: **Use Case Catalog/Specifications** và **Database Schema/ERD**. Đối chiếu review checklist.
6. Khi Design Baseline đã được duyệt và Gate P0 có bằng chứng, mới gửi: `CONTINUE PHASE 1`.

## Quy tắc quan trọng

- `Guest / Customer / Admin` là 3 personas duy nhất của bản gốc.
- Không xây RetailMind Ops, ERP, Staff, Purchasing; ý tưởng ngoài phạm vi chỉ ghi backlog.
- PostgreSQL là nguồn sự thật giao dịch; Qdrant chỉ lưu retrieval index, không lưu giá hay tồn kho authoritative.
- Mọi đơn hàng là **SIMULATED**, không thanh toán/vận chuyển thật.
- Mock LLM phục vụ kiểm thử deterministic; không mô tả đó là LLM thực chạy.
- Không auto-phê duyệt baseline; Phase 0 chưa đạt có thể báo `BLOCKED` trung thực.

## Ghi chú tính xác thực

Các GitHub reference và thông tin SDK là **danh sách tài liệu kỹ thuật để khảo sát**, chưa được gói này kiểm chứng commit hoặc runnable status. Các văn bản pháp luật được nêu như điểm cần kiểm tra nguồn chính thức tại lúc triển khai, không phải tư vấn pháp lý.

**SQL design candidate:** `templates/PHASE0_SCHEMA_CANDIDATE.sql` là bản DDL tham khảo (22 bảng), **chưa chạy/không dùng trực tiếp làm migration** trước khi Phase 0 review.
