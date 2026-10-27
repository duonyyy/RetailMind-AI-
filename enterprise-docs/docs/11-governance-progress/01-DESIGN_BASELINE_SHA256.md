# Cơ Sở Thiết Kế Đã Đóng Băng v1.0 (Design Baseline v1)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/architecture/DESIGN_BASELINE_v1.md`  
**Căn cứ đặc tả:** `prompt_sections/04_PHASE_PLAN.md` (P0.6), `AGENTS.md` & `PLANS.md`  
**Giai đoạn:** Phase 0 — Design Freeze & Khảo Sát Nền Tảng  
**Phiên bản Baseline:** `v1.0-FROZEN`  
**Ngày chốt cơ sở:** 2026-10-20  
**Trạng thái pháp lý:** CHÍNH THỨC ĐÓNG BĂNG — SẴN SÀNG DUYỆT CỔNG GATE P0  

---

## 1. Tuyên Ngôn Đóng Băng Thiết Kế (Design Freeze Declaration)

Tài liệu này xác lập **Cơ Sở Thiết Kế v1.0 (Design Baseline v1)** chính thức cho toàn bộ dự án **RetailMind AI**. Kể từ thời điểm ban hành:
1. Toàn bộ phạm vi chức năng, 3 Personas, 12 Use Cases, 25 Business Rules, 22 bảng CSDL quan hệ, 13 công cụ tác tử AI định kiểu Pydantic, và mô hình kiến trúc Modular Monolith được **khóa chặt (Scope Lock)**.
2. Mọi thay đổi đối với các tài liệu trong danh mục Baseline này bắt buộc phải tuân theo quy trình Yêu Cầu Thay Đổi (Change Request - RFC) được quy định tại [docs/roadmap/FUTURE_EXPANSIONS.md](file:///c:/Users/Admin/Desktop/ExcelMCP/MWG_AI_Engineer_Interview_Study_Kit/RetailMind_AI/docs/roadmap/FUTURE_EXPANSIONS.md) và phải được Product Owner phê duyệt trước khi sửa đổi mã nguồn.
3. Mã nguồn thực thi từ Phase 1 trở đi phải tuân thủ 100% các hợp đồng API, DTOs, cấu trúc bảng CSDL và ràng buộc toàn vẹn đã được định nghĩa trong Baseline v1 này.

---

## 2. Bảng Kiểm Kê Hồ Sơ Thiết Kế & Mã Băm SHA-256 (Artifact Baseline Inventory)

Toàn bộ 38 tài liệu cấu thành nền tảng Phase 0 được kiểm kê chi tiết kèm đường dẫn và mã băm toàn vẹn SHA-256:

### A. Hiến Pháp & Kế Hoạch Tổng Thể (Governance & Plans)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 1 | `AGENTS.md` | Hiến pháp | 4 tôn chỉ tối thượng, chuẩn công nghệ, kỷ luật phạm vi | `e0b7893c3fc977f5892a15122083673059bcbd13d56831fde693da5e5a20c110` |
| 2 | `PLANS.md` | Lộ trình | Kế hoạch tổng thể 10 phân kỳ (P0–P9), checklist chi tiết | `fb19df62c739933198c25250482e1e5177df9aac6ccc4149d6a9845566576107` |

### B. Khối Yêu Cầu & Ca Sử Dụng (Requirements & Use Cases — P0.3)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 3 | `docs/requirements/01_PRODUCT_VISION_AND_SCOPE.md` | Tầm nhìn | 6 outcomes sản phẩm, lát cắt dọc 10 bước E2E | `f79f57f5f5ba30705bd038fe5b7c3052c6a67be126c5cd34951611da867285ba` |
| 4 | `docs/requirements/actors.md` | Tác nhân | 3 personas (Guest, Customer, Admin), ranh giới bảo mật | `1301b17775f50a24983edb4d705c866d01d797ad39b264a02a9d50873ecbf12b` |
| 5 | `docs/requirements/use-case-catalog.md` | Danh mục UC | Danh mục cố định 12 Use Cases (UC01–UC12) | `4cb7802d01f20e4b54098033d280d53e759b63c1d1b53b1cfe857a285eaa1815` |
| 6 | `docs/requirements/use-case-diagram.md` | Sơ đồ Mermaid | Sơ đồ ca sử dụng toàn cảnh, sơ đồ UC03 & UC08 | `3fbf45496ffb9ca88dfc16e1aaa1376b80cfa83533d19bc45de7ba1a010e98bf` |
| 7 | `docs/requirements/use-case-specifications.md` | Đặc tả chi tiết | Hợp đồng 15 thuộc tính cho 12 UCs, kịch bản lỗi & ATs | `f0001428a8a43dabf9ab2ff3c519ea394237e01e549caef5a0bde05bd13433e6` |
| 8 | `docs/requirements/permissions-matrix.md` | Phân quyền | Ma trận RBAC & IDOR cho 22 bảng CSDL và 13 tools | `639853d86404adb001991c8ffc2fbb5d1fce1b457cf67f4db5afde770dfcffc7` |
| 9 | `docs/requirements/business-rules.md` | Quy tắc | 25 Business Rules phòng thủ 5 tầng, snapshot giá & kho | `58c8b750a26f1c7d4bdaf84e06b2ff53c8e87a5719936d640470d281919f2a86` |
| 10 | `docs/requirements/traceability-matrix.md` | Truy vết | Ma trận 10 cột, kiểm kê 22 bảng, 17 ATs NOT_RUN | `43c695cb60ce6ff1ecaf02d954b20c34858e6d12c63d6255f4068dda9eb0c927` |
| 11 | `docs/roadmap/FUTURE_EXPANSIONS.md` | Ngoài phạm vi | Sổ tay 8 tính năng ngoài scope, quy trình RFC | `b0ab49b22dfccc834d1b79df95f8057454ea0fd86e8934a5b451a811dcda0954` |

### C. Khối Khảo Sát Bằng Chứng Nguồn (Research & Evidence — P0.2)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 12 | `docs/research/inventory.md` | Hồ sơ nguồn | Khảo sát 16 repos mở kèm giấy phép và cảnh báo | `3bdefc0637d7de12abb3a963e14cf430c20912d78b9c8a667db7748f3502fb70` |
| 13 | `docs/research/evidence-matrix.md` | Ma trận bằng chứng | 10 cột đối chiếu code thật với quyết định tiếp nhận | `0dec375abdec617dbbd6542ae203aa12360c3fe05ab6a8c13d115d64630138a5` |
| 14 | `docs/research/commerce-flow.md` | Luồng giao dịch | Preview token, khóa bi quan, Idempotency, snapshot giá | `4b1ace13916dac874366ec6f8fe96b9d416872b9645f66e54481077a6d324a09` |
| 15 | `docs/research/agent-tool-flow.md` | Điều phối AI | LangGraph StateGraph, Typed Tools, trần MAX_STEPS = 5 | `564a6772e8ed2b936fd71f1e13c144764c7119b6c45dfd9a6dea7e4fbc6a5dd9` |
| 16 | `docs/research/rag-flow.md` | Vòng đời RAG | Qdrant payload, xác minh 2 chiều, từ chối trả lời | `fbe6ca66bed0e292db3cdbaac39f01ddcf02107a539146dd480db20adbd194d1` |
| 17 | `docs/research/security-reliability.md` | An ninh & Bền bỉ | Zero-Trust, PII tiếng Việt, Circuit Breaker 3 trạng thái | `204e5c1d4018893cdfde8415de1b77e22d912fa4aff155447c2520b9a3bd9f24` |
| 18 | `docs/research/evaluation.md` | Đánh giá | Khung đánh giá kép, công thức đo lường, Mock Provider | `f72a37feb65fd5680cd1ea3c37760bd74e926eb2be7f6d106dc89b847486b716` |
| 19 | `docs/research/integration-decisions.md` | Quyết định tích hợp | 8 quyết định nền tảng làm tiền đề cho ADRs | `efd733cbb4fc7c1fe2fa8e6efb36e00ed715264605f24afc9617e16fc6d1903f` |
| 20 | `docs/research/rejected-patterns.md` | Mẫu bác bỏ | Danh mục 10 anti-patterns bị cấm tuyệt đối | `50d9564db0b6a8f51daf28259458a329913fa7c548b41de2c457ed0e515d4644` |

### D. Khối Thiết Kế Cơ Sở Dữ Liệu (Database Design — P0.4)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 21 | `docs/database/01_conceptual_model.md` | Khái niệm | 8 Bounded Contexts, kiểm kê chính xác 22 thực thể cốt lõi | `b36a3fc1c4be4a982abff42142db8a930ff00e334bf88ea9d3c921f9af6a1ec9` |
| 22 | `docs/database/02_logical_schema.md` | Logic | Lược đồ logic 22 bảng, chiến lược UUIDv4, phân loại data | `190b128a9a7bbc43c41e4817865551d5c64b7ed5ad07f50fbdc76a944d18a285` |
| 23 | `docs/database/03_physical_schema.md` | Vật lý DDL | DDL PostgreSQL 16+, trigger updated_at, NUMERIC(18, 0) | `a858dfe8ff707d8c3f705e8019ea183fa2d89b31819641c4f9f719e93fa659df` |
| 24 | `docs/database/04_erd.md` | Sơ đồ ERD | ERD 2 tầng (Toàn cảnh + 3 nhóm chi tiết A, B, C) | `0f00178431723156ac29a6ae73b29f0ac01d530d11a4d296e31f9cd1f9dd7357` |
| 25 | `docs/database/05_data_dictionary.md` | Từ điển dữ liệu | Đặc tả chi tiết từng cột, kiểu, nullability, defaults, enums | `38ae61e22122dc2f697a15ffccc996752e95c5c050cbafa4fd8b07005bc60487` |
| 26 | `docs/database/06_constraints_indexes.md` | Ràng buộc & Index | Partial Uniques, B-Tree, cơ chế khóa dòng bi quan chống Deadlock | `f38e9261d6fafcd5b867c83224d6373d4560259919abca57bb7e6b023e9be9ff` |
| 27 | `docs/database/07_migration_plan.md` | Di trú Alembic | Lộ trình di trú 5 phase (P1–P5), đồ thị DAG, Seed data | `34e6fecd409f3e862c718214b67cf9a0ae2af692314382fc1572cb86023feb66` |

### E. Khối Kiến Trúc & Hợp Đồng Hệ Thống (Architecture & Contracts — P0.5)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 28 | `docs/architecture/01_system_architecture.md` | Kiến trúc C4 | Modular Monolith, sơ đồ C4 3 tầng, 3 ranh giới Zero-Trust | `783162b88a8770b3d4059e9b218caacadd6fe2434804733220a5eacd8f1b1d1b` |
| 29 | `docs/architecture/02_api_and_tool_contracts.md` | Hợp đồng API | Envelope format, DTOs, 13 Typed Tools, SSE events | `b0fc4216edc49ca3de255b4062d9b36b733af4181dad3a5c13111e80e9b8546e` |
| 30 | `docs/architecture/03_security_threat_model.md` | Mô hình đe dọa | STRIDE 12 mã, phòng thủ IDOR, bộ lọc PII tiếng Việt | `4f225717bff842e829646a7adf61f095446bb0550348c11d1d2c1b9282a86119` |
| 31 | `docs/architecture/adr/ADR-001_qdrant_vs_pgvector.md` | ADR | Chọn Qdrant làm chỉ mục vector, PG làm SSOT | `9b673e3bc2bc792ab1901bb7a35bd42742c96708ab2faa87d0b5688aaf7ac9ae` |
| 32 | `docs/architecture/adr/ADR-002_internal_tools_vs_mcp.md` | ADR | Ưu tiên Typed Tools nội bộ ở P4, dời MCP sang P8 | `31295e17e48972e451c377e4fa848552917db57b432d027fa5ceb0a8fd03251f` |
| 33 | `docs/architecture/adr/ADR-003_single_agent_vs_multi_agent.md` | ADR | Chọn 1 LangGraph StateGraph, trần MAX_STEPS = 5 | `fd0d20e6849825ab419d03bb3ca6467a6386b37d07d79b5588a0487a354e0013` |
| 34 | `docs/architecture/adr/ADR-004_typed_sql_vs_text_to_sql.md` | ADR | Cấm Text-to-SQL, bắt buộc dùng Typed Tools an toàn | `a3f97485aca4b0f8eb0e23f6fb59484169864887b0f866b54631292fe6d48c87` |
| 35 | `docs/architecture/adr/ADR-005_inventory_and_order_lifecycle.md` | ADR | Khóa bi quan CSDL, preview 10m, hủy hoàn tồn kho 1 lần | `39ec3249ba7465d5b3ad53be07210dce8d9b17b66f7ec317588cfd3b8f0210f4` |
| 36 | `docs/architecture/adr/ADR-006_modular_monolith_architecture.md` | ADR | Chọn Modular Monolith thay vì Microservices phân tán | `bd1ee245c6926f1edd5ac934b46f27c4a3fdb68cfc3b7eddc0ca516c41ef59aa` |

### F. Khối Quản Trị Tiến Độ & Quyết Định (Progress & Decisions)
| STT | Đường Dẫn Tương Đối | Phân Loại | Mục Đích Tài Liệu | Mã Băm SHA-256 Toàn Vẹn |
|:---:|---|---|---|---|
| 37 | `docs/progress/DECISIONS.md` | Sổ cái quyết định | 22 quyết định kỹ thuật chính thức (DEC-01-01 đến DEC-01-22) | `a996724f5304c9e273bca539853c63c07d9758fb4078b95c155ac85635cc34b4` |
| 38 | `docs/progress/PROJECT_STATUS.md` | Báo cáo tiến độ | Tiến độ phân kỳ, kiểm tra chất lượng các gói P0 | `52dfac32c055267e19c0709c9fb1ddc5635f95d7070033ae7f59cc202189ddc9` |

---

## 3. Tổng Hợp Các Quyết Định Kiến Trúc Then Chốt Đã Khóa

1. **Khóa Chân Lý Dữ Liệu (SSOT):** PostgreSQL 16+ là nguồn chân lý duy nhất cho giao dịch, tiền tệ và số lượng tồn kho khả dụng. Qdrant chỉ đóng vai trò thứ cấp phục vụ tra cứu ngữ nghĩa tương đồng (ADR-001).
2. **Khóa Tiền Tệ & Định Lượng:** Toàn bộ giá niêm yết, tổng tiền đơn hàng dùng `NUMERIC(18, 0)` trong PostgreSQL và kiểu `Decimal` trong Python/Pydantic; nghiêm cấm sử dụng kiểu `FLOAT` (DEC-01-07).
3. **Khóa Ranh Giới Tác Tử (Agent Safety Boundary):** LLM không có quyền kết nối CSDL trực tiếp, không có quyền chạy Shell/Docker. LLM chỉ đề xuất `tool_calls` qua JSON schema; Backend Service độc lập thực hiện xác thực kiểu (Pydantic), kiểm tra phân quyền (Authz) và chạy truy vấn tham số hóa (Parameterized Query) (ADR-002, ADR-004).
4. **Khóa Vòng Đời Đơn Hàng & Chống Đua (Race Condition Defense):** Chu trình chốt đơn 2 bước (Preview Token 10 phút $\to$ Explicit Confirm). Thao tác chốt đơn giữ khóa bi quan `SELECT ... FOR UPDATE` trên các dòng tồn kho sắp xếp tăng dần theo `(store_id, variant_id)` để chống Deadlock. Cấm tác tử AI tự động chốt đơn (ADR-005).
5. **Khóa Trích Dẫn Hai Chiều (Two-Way RAG Verification):** Câu trả lời tư vấn chính sách bảo hành bắt buộc trích dẫn `document_version_id` và `chunk_id`. Backend xác minh phiên bản tài liệu phải đang ở trạng thái `status = 'published'` tại PostgreSQL trước khi trả lời. Nếu không đủ chứng cứ, hệ thống bắt buộc từ chối trả lời lịch sự (Honest Abstention) (DEC-01-14).
6. **Khóa Bảo Vệ Dữ Liệu Cá Nhân (PII Sanitization):** Toàn bộ dữ liệu hội thoại trước khi gửi sang LLM ngoại vi phải qua tầng lọc PII tiếng Việt làm sạch CCCD (12 số), Số điện thoại (10 số) và Email, tuân thủ Nghị định 13/2023/NĐ-CP và Luật 91/2025/QH15 (DEC-01-16).
7. **Khóa Phạm Vi Triển Khai (Scope Lock):** Chỉ phát triển 3 Personas (`Guest`, `Customer`, `Admin`), 12 Use Cases (`UC01` đến `UC12`), 22 bảng CSDL quan hệ. Không xây dựng RetailMind Ops AI, ERP, quản lý nhân viên, chấm công hay Procurement (DEC-01-01).

---

## 4. Biên Bản Kiểm Soát Phiên Bản & Đăng Ký Chữ Ký

* **Phiên bản tài liệu:** `v1.0-FROZEN`
* **Thời điểm xác lập:** 2026-10-20T17:55:00+07:00
* **Kỹ sư trưởng kiến trúc (Lead AI Systems Architect):** Antigravity Engineering Agent
* **Đại diện Chủ Quản Sản Phẩm (Product Owner / Human Approver):** Đang chờ ký duyệt tại [00-DESIGN_REVIEW.md](../03-architecture-api/00-DESIGN_REVIEW.md).
