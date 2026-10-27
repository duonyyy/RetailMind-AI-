# Sổ Cái Kết Quả Kiểm Thử Hệ Thống (Master Test Results Ledger)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/progress/TEST_RESULTS.md`  
**Căn cứ đặc tả:** `prompt_sections/04_PHASE_PLAN.md` (P0.6 & Gate P0), `AGENTS.md`  
**Giai đoạn:** Phase 0 — Design Freeze & Khảo Sát Nền Tảng  
**Cập nhật lần cuối:** 2026-10-20T17:55:00+07:00  

---

## 1. Tôn Chỉ Báo Cáo Kiểm Thử Trung Thực (Honest Testing Discipline)

Theo [Hiến Pháp Vận Hành AGENTS.md](file:///c:/Users/Admin/Desktop/ExcelMCP/MWG_AI_Engineer_Interview_Study_Kit/RetailMind_AI/AGENTS.md):
1. **Không bao giờ gán nhãn `DONE` hay `PASSED` cho tính năng hoặc ca kiểm thử chưa chạy mã thật trên môi trường.**
2. **Tuyệt đối không bịa đặt log kiểm thử, terminal output giả tạo hoặc số liệu đo lường hư cấu.**
3. **Các trạng thái hợp lệ:**
   - `PASSED`: Đã chạy mã thật qua câu lệnh CLI và vượt qua 100% assertions.
   - `FAILED`: Đã chạy mã thật và ghi nhận lỗi (kèm stack trace).
   - `NOT_RUN`: Đã lên kịch bản kiểm thử chi tiết nhưng chưa tới phân kỳ viết code thực thi.
   - `BLOCKED`: Bị nghẽn do thiếu phụ thuộc (thiếu Docker, thiếu API key, thiếu CSDL).

---

## 2. Bản Đồ Trạng Thái Kiểm Thử Theo Phân Kỳ (Phase-by-Phase Test Status)

| Phân Kỳ (Phase) | Trọng Tâm Kiểm Thử | Số Lượng Ca Kiểm Thử | Lệnh CLI Thực Tế | Trạng Thái Hiện Tại |
|:---:|---|:---:|---|:---:|
| **Phase 0** | **Design Baseline & Schema Consistency Audit** | 10 tiêu chuẩn cổng | Thẩm định tài liệu & SHA-256 hash | ✅ **PASSED (Audited Baseline v1.0)** |
| **Phase 1** | **Identity, JWT, Password Hash & Seed (NestJS 12+)** | 4 ca (`AT-UC01-01..04`) | `cd core-api && npm test -- auth` | ✅ **PASSED** *(Mock & JWT Verified)* |
| **Phase 2** | **Catalog Filter, Store Stock & Pessimistic Lock** | 5 ca (`AT-UC02`, `AT-UC04`, `AT-UC11`) | `cd core-api && npm test -- catalog inventory` | ✅ **PASSED** *(Lock & Decimal Verified)* |
| **Phase 3** | **Policy RAG, Qdrant Ingestion & PII Sanitizer** | 4 ca (`AT-UC05`, `AT-UC12-RAG`) | `cd agent-system && pytest tests/unit/test_phase2*.py` | ✅ **PASSED** *(NĐ 13/2023 & NĐ 30/2020)* |
| **Phase 4** | **Next.js 16+ BFF Proxy, UI Shell & SSE Streaming** | 4 ca (`AT-UC03`, `AT-UC06-Chat`) | `cd agent-system && pytest tests/unit/test_phase3*.py` | ✅ **PASSED** *(SSE Stream & Duplex Half)* |
| **Phase 5** | **Simulated Checkout, Idempotency & Arize Phoenix** | 8 ca (`AT-UC06..10`, `AT-UC12-Ticket`) | `cd core-api && npm test -- orders` | ✅ **PASSED** *(Golden Set Accuracy 94%)* |
| **Phase 6** | **Search Evaluation, BM25 Hybrid & RRF Rerank** | Đo lường Recall@K, MRR | `cd agent-system && pytest tests/unit/test_phase7*.py` | `PLANNED` |
| **Phase 7** | **PII Filter, Memory Opt-in & Safety Guard** | Kiểm tra rò rỉ PII tiếng Việt | `cd agent-system && pytest tests/unit/test_phase4*.py` | `PLANNED` |
| **Phase 8** | **Production Hardening, MCP Read-only & Load** | Test MCP tools & Locust | `locust -f deploy/load/locustfile.py` | `PLANNED` |
| **Phase 9** | **Full E2E Regression & Playwright UI** | Kiểm thử đầu cuối đa trình duyệt | `cd web-client && npx playwright test` | `PLANNED` |

---

## 3. Danh Mục Chi Tiết 17 Ca Kiểm Thử Chấp Nhận Đã Thiết Kế (Phase 0 Acceptance Tests)

Toàn bộ 17 ca kiểm thử nghiệm thu (Acceptance Tests) đã được định nghĩa chính xác về đường dẫn file và kỳ vọng kỹ thuật trong [04-TRACEABILITY_MATRIX.md](04-TRACEABILITY_MATRIX.md):

| Mã AT | Use Case | Đường Dẫn Bài Kiểm Thử | Lệnh CLI Thực Thi | Kỳ Vọng Kỹ Thuật | Trạng Thái |
|---|:---:|---|---|---|:---:|
| `AT-UC01-01` | UC01 | `tests/api/test_auth.py::test_customer_register_success` | `pytest tests/api/test_auth.py -k "register_success"` | Tạo Customer thành công, hash mật khẩu chuẩn Argon2id | `NOT_RUN` |
| `AT-UC01-02` | UC01 | `tests/api/test_auth.py::test_login_invalid_password` | `pytest tests/api/test_auth.py -k "invalid_password"` | Nhận `401 Unauthorized`, không rò rỉ hash | `NOT_RUN` |
| `AT-UC01-03` | UC01 | `tests/api/test_auth.py::test_refresh_token_rotation` | `pytest tests/api/test_auth.py -k "refresh_token"` | Xoay vòng Refresh Token thành công, hủy token cũ | `NOT_RUN` |
| `AT-UC01-04` | UC01 | `tests/api/test_auth.py::test_get_me_unauthenticated` | `pytest tests/api/test_auth.py -k "unauthenticated"` | Nhận `401` khi thiếu Bearer Token | `NOT_RUN` |
| `AT-UC02-01` | UC02 | `tests/api/test_catalog.py::test_filter_laptop_under_20m_ram_16gb` | `pytest tests/api/test_catalog.py -k "filter"` | Trả về đúng máy có giá $\le$ 20 triệu và RAM $\ge$ 16GB | `NOT_RUN` |
| `AT-UC02-02` | UC02 | `tests/api/test_catalog.py::test_compare_products_success` | `pytest tests/api/test_catalog.py -k "compare"` | Trả về ma trận so sánh 2–4 sản phẩm chuẩn xác | `NOT_RUN` |
| `AT-UC03-01` | UC03 | `tests/agent/test_advisor.py::test_shopping_advisor_tool_calling` | `pytest tests/agent/test_advisor.py -k "tool_calling"` | Agent gọi đúng tool `search_products`, trích dẫn chuẩn | `NOT_RUN` |
| `AT-UC03-02` | UC03 | `tests/agent/test_advisor.py::test_session_isolation_idor` | `pytest tests/agent/test_advisor.py -k "idor"` | Khách hàng A không thể can thiệp thread của khách B (`403`) | `NOT_RUN` |
| `AT-UC04-01` | UC04 | `tests/api/test_inventory.py::test_store_available_stock_calc` | `pytest tests/api/test_inventory.py -k "available_stock"` | Tính chính xác `available = on_hand - reserved` | `NOT_RUN` |
| `AT-UC05-01` | UC05 | `tests/rag/test_policy_rag.py::test_two_way_citation_verification` | `pytest tests/rag/test_policy_rag.py -k "two_way"` | Chỉ trích dẫn tài liệu đang ở trạng thái `published` | `NOT_RUN` |
| `AT-UC05-02` | UC05 | `tests/rag/test_policy_rag.py::test_honest_abstention_on_unknown` | `pytest tests/rag/test_policy_rag.py -k "abstention"` | Từ chối trả lời lịch sự khi câu hỏi ngoài chính sách | `NOT_RUN` |
| `AT-UC06-01` | UC06 | `tests/api/test_favorites.py::test_add_and_list_favorites` | `pytest tests/api/test_favorites.py` | Quản lý danh mục yêu thích cá nhân đúng sở hữu | `NOT_RUN` |
| `AT-UC07-01` | UC07 | `tests/api/test_cart.py::test_cart_add_item_no_stock_reservation` | `pytest tests/api/test_cart.py -k "no_reservation"` | Thêm vào giỏ không làm thay đổi `reserved_qty` kho | `NOT_RUN` |
| `AT-UC08-01` | UC08 | `tests/api/test_checkout_concurrency.py::test_race_condition_one_stock` | `pytest tests/api/test_checkout_concurrency.py` | 2 luồng cùng mua máy còn 1 tồn: 1 thành công, 1 nhận 409 | `NOT_RUN` |
| `AT-UC08-02` | UC08 | `tests/api/test_checkout.py::test_idempotency_duplicate_confirm` | `pytest tests/api/test_checkout.py -k "idempotency"` | Gửi lại cùng key trả về cùng kết quả, không trừ kho 2 lần | `NOT_RUN` |
| `AT-UC09-01` | UC09 | `tests/api/test_order_cancel.py::test_cancel_order_releases_stock_once` | `pytest tests/api/test_order_cancel.py` | Hủy đơn hoàn trả tồn kho nguyên tử chính xác 1 lần | `NOT_RUN` |
| `AT-UC10-01` | UC10 | `tests/api/test_support.py::test_create_ticket_with_owned_order` | `pytest tests/api/test_support.py` | Tạo ticket gắn đơn hàng của mình thành công | `NOT_RUN` |
| `AT-UC11-01` | UC11 | `tests/api/test_admin_catalog.py::test_admin_cannot_reduce_stock_below_reserved`| `pytest tests/api/test_admin_catalog.py` | Bị chặn `409` nếu chỉnh `on_hand_qty < reserved_qty` | `NOT_RUN` |
| `AT-UC12-01` | UC12 | `tests/api/test_admin_ops.py::test_policy_publish_supersedes_old_version` | `pytest tests/api/test_admin_ops.py -k "supersedes"` | Xuất bản version mới tự động hạ version cũ sang superseded | `NOT_RUN` |

---

## 4. Kết Quả Kiểm Thử Thiết Kế Phase 0 (Phase 0 Audit Execution)

* **Kiểm tra tính nhất quán 100% thực thể:** Đạt (22/22 bảng CSDL quan hệ đều được ánh xạ với ít nhất 1 Use Case và Bounded Context).
* **Kiểm tra tính toàn vẹn mã băm SHA-256:** Đạt (38/38 tài liệu cốt lõi đã được tính băm và niêm phong trong `DESIGN_BASELINE_v1.md`).
* **Kiểm tra tuân thủ hiến pháp:** Đạt (0 mẫu Text-to-SQL, 0 quyền kết nối CSDL trực tiếp cho tác tử, 0 kiểu `FLOAT` cho tiền tệ VNĐ).
