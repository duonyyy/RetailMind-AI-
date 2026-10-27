# Changelog — RetailMind AI Documentation Package

## Nguồn gốc

Đặc tả kỹ thuật hệ thống RetailMind AI e-commerce demo, stack công nghệ và lộ trình triển khai chuẩn Phase 0–9.

## Cải tiến trọng tâm

1. **Phase 0 = Source Audit + Requirements Engineering + Database Design + Architecture Design + Design Review.** Không dừng ở ERD sơ bộ.
2. **Gate P0 cứng:** đặc tả UC, business rules, role permissions, conceptual/logical/physical PostgreSQL, data dictionary, ERD, PK/FK/check/index, schema migration plan, API/service/tool/test traceability, ADR và design approval.
3. Thêm section `06_USE_CASE_SPECIFICATION.md` (UC01–UC12 và matrix) và `07_DATABASE_DESIGN.md` (22 thực thể, schema ứng viên, ERD, constraints, migrations).
4. Master chuẩn hóa quy trình Phase 0–9; Phase 0 không tự chạy sang P1 dù `AUTO_PHASED` nếu chưa có approval.
5. Đồng bộ mọi section với use-case IDs, DB ownership, SQL source of truth và nguyên tắc `LLM proposes -> trusted services execute`.
6. Ghi rõ **candidate ≠ approved ≠ implemented**; tránh tuyên bố quá mức.

## Phạm vi nền tảng cốt lõi

- Guest/Customer/Admin; use case demo laptop ~20 triệu RAM >=16GB; catalog SQL, recommendation, Qdrant RAG, LangGraph, simulated orders, tickets.
- 10 phase (P0–P9), P5 MVP gate, P6 hybrid/RRF/reranker eval, P7 memory/privacy, P8 MCP/observability/load, P9 portfolio.
- Research refs, evidence matrix, tests, deterministic mock vs cloud model, privacy trust boundary, authz/idempotency/PII egress.
- React/TypeScript/Vite + FastAPI/Python/SQLAlchemy/Alembic + PostgreSQL + Qdrant (Baseline ban đầu) -> Chuyển đổi theo ADR-007: Next.js 14+ (Frontend SSR) + NestJS 10+ (Backend Core SSOT) + Python 3.11+ LangGraph (AI Agent Engine) + PostgreSQL 16+ + Qdrant.

## Các quyết định còn phải review trong Phase 0

- `users.role_id` một vai trò tại thời điểm v1; nếu cần nhiều vai trò sẽ có ADR và bảng nối.
- Giá chính thức đặt ở `variants.price_vnd`; `order_items` lưu snapshot giá; no real payments.
- `inventory.on_hand_qty`/`reserved_qty`, atomic reservation tại lúc confirm; hủy giải phóng reservation một lần.
- Guest truy cập search + public policy nhưng không truy cập private sessions/cart/orders.
- Chat AI là luồng authenticated `Customer` trong baseline v1; nếu cho Guest chat phải có rate limit/session/retention rule riêng.
- Bản thiết kế ứng viên 22 bảng; có thể thay đổi field/constraint nếu ADR và traceability chứng minh được mà không tự ý mở domain.
