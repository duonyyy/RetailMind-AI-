# 🏛️ Architecture Decision Records (ADR) Index

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/03-architecture-api/adr/README.md`  
**Tiêu chuẩn**: Định dạng Michael Nygard (Context, Decision, Consequences, Compliance)  
**Trạng thái**: Approved Baseline (Production 2026 Edition)  

---

## 1. Danh Mục Các Bản Ghi Quyết Định Kiến Trúc Đã Ban Hành

| Mã ADR | Tiêu Đề Quyết Định | Trạng Thái | Ngày Quyết Định | Tác Động & Đánh Đổi Chính |
|:---:|---|:---:|:---:|---|
| **[ADR-001](ADR-001_qdrant_vs_pgvector.md)** | Chọn Qdrant làm chỉ mục vector thứ cấp thay vì pgvector | `ACCEPTED` | 2026-10-20 | Cô lập tài nguyên tính toán vector nặng nề, giữ PostgreSQL làm SSOT cho giao dịch |
| **[ADR-002](ADR-002_internal_tools_vs_mcp.md)** | Ưu tiên công cụ nội bộ định kiểu Pydantic ở Phase 4, dời MCP sang Phase 8 | `ACCEPTED` | 2026-10-20 | Đơn giản hóa kiến trúc agent ban đầu, tối ưu hiệu năng gọi hàm nội bộ |
| **[ADR-003](ADR-003_single_agent_vs_multi_agent.md)** | Chọn 1 LangGraph StateGraph điều phối duy nhất thay vì Multi-Agent Swarm | `ACCEPTED` | 2026-10-20 | Loại bỏ nguy cơ vòng lặp vô hạn, kiểm soát trần suy luận `MAX_STEPS = 5` |
| **[ADR-004](ADR-004_typed_sql_vs_text_to_sql.md)** | Cấm tuyệt đối Text-to-SQL, bắt buộc dùng Typed Tools & Parameterized SQL | `ACCEPTED` | 2026-10-20 | Triệt tiêu 100% rủi ro SQL Injection và ảo giác lược đồ CSDL |
| **[ADR-005](ADR-005_inventory_and_order_lifecycle.md)** | Quy trình chốt đơn 2 bước, khóa bi quan CSDL và hủy hoàn kho 1 lần | `ACCEPTED` | 2026-10-20 | Triệt tiêu rủi ro Oversell khi có tranh chấp đồng thời, cấm AI tự chốt đơn |
| **[ADR-006](ADR-006_modular_monolith_architecture.md)** | Chọn phong cách Modular Monolith thay vì Microservices phân tán | `SUPERSEDED BY ADR-007` | 2026-10-20 | Nền tảng nguyên khối phân mô-đun được kế thừa trong NestJS Commerce Core và nâng cấp tại ADR-007 |
| **[ADR-007](ADR-007_polyglot_architecture_nestjs_nextjs_python.md)** | Chuyển đổi Stack sang Polyglot (NestJS Backend + Next.js Frontend + Python Agent) | `ACCEPTED` | 2026-10-21 | Tối ưu SEO Next.js, kiến trúc doanh nghiệp NestJS TypeORM, chuyên biệt hóa Python cho LangGraph |
| **[ADR-008](ADR-008_vietnamese_hierarchical_rag_and_async_ingestion.md)** | RAG phân cấp tiếng Việt (NĐ 30), Ingestion Idempotent, lọc CJK & Citation Whitelist | `ACCEPTED` | 2026-10-23 | Phân mảnh 11 bậc pháp lý, xóa vector cũ triệt để, triệt tiêu ảo giác CJK và trích dẫn giả mạo |
| **[ADR-009](ADR-009_nextjs_bff_reverse_proxy_and_clean_architecture.md)** | Next.js BFF Reverse Proxy, phân tách Query/Action & Dynamic RBAC UI | `ACCEPTED` | 2026-10-23 | Bảo vệ Token trong HttpOnly Cookie, SSE duplex half streaming, chuẩn hóa fetcher và phân quyền UI |

---

## 2. Quy Trình Ban Hành ADR Mới

Mọi quyết định kiến trúc mới có tác động lớn đến hệ thống phải tạo file theo mẫu [ADR-000-TEMPLATE.md](ADR-000-TEMPLATE.md) và được Product Owner phê duyệt trước khi sửa đổi mã nguồn.
