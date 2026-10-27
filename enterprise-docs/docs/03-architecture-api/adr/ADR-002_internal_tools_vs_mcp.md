# ADR-002: Ưu Tiên Công Cụ Nội Bộ Định Kiểu Pydantic Trước Khi Tích Hợp MCP

**Mã quyết định:** `ADR-002`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `APPROVED FOR BASELINE`  
**Ngày quyết định:** 2026-10-20  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** `prompt_sections/04_PHASE_PLAN.md` (Gate P0-G06) & `prompt_sections/02_ARCHITECTURE_AND_DOMAIN.md` (Mục 4.3)  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Khi xây dựng trợ lý ảo tư vấn mua sắm (Shopping Advisor AI — `UC03`), tác tử cần tương tác với dữ liệu catalog, tồn kho và giỏ hàng.
Có hai hướng tiếp cận để cung cấp công cụ (Tools) cho Agent:
1. **Lựa chọn A (MCP First):** Xây dựng toàn bộ công cụ dưới dạng một máy chủ Model Context Protocol (MCP Server) độc lập ngay từ đầu.
2. **Lựa chọn B (Internal Typed Tools First, MCP Deferred):** Xây dựng công cụ nội bộ định kiểu bằng Pydantic V2 trực tiếp trong mã nguồn Backend ở Phase 4, sau đó đóng gói một MCP Server chỉ đọc (Read-Only MCP) độc lập tại Phase 8.

---

## 2. Phân Tích So Sánh Các Giải Pháp (Options Comparison)

| Tiêu chí | Lựa chọn A: MCP First (Ngay từ P4) | Lựa chọn B: Pydantic Typed Tools First (P4), MCP tại P8 |
|---|---|---|
| **Độ trễ & Overhead mạng** | Giao tiếp qua giao thức JSON-RPC qua Stdio hoặc SSE, làm tăng độ trễ mạng trong từng bước lặp của LangGraph. | Gọi trực tiếp qua Python in-process memory call tới Application Service; độ trễ gần như bằng 0 (< 2ms). |
| **Kiểm soát kiểu & Xác thực** | Phụ thuộc vào schema MCP; khó kiểm soát ràng buộc kiểu phức tạp của Pydantic V2. | Sử dụng đầy đủ sức mạnh của Pydantic V2 (`Field`, `gt`, `min_length`, regex), bắt lỗi schema trước khi gọi API DB. |
| **Bảo vệ quyền & Quản lý Transaction** | Khó truyền ngữ cảnh xác thực (JWT Token, `current_user.id`) và mở Transaction ACID trong cùng luồng xử lý. | Xác thực Server-Side qua `X-Internal-Secret` & Header `Authorization`, mở Transaction ACID và Pessimistic Lock qua NestJS Backend. |
| **Tiến độ phát triển (Phasing)** | Gây quá tải phạm vi (Scope Overload) ở Phase 4 khi vừa phải dựng Agent vừa phải debug giao thức MCP. | Chia nhỏ mục tiêu: Hoàn thiện năng lực tư vấn nội bộ ở Phase 4 $\to$ Mở rộng giao diện tích hợp ngoại vi ở Phase 8. |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: ƯU TIÊN XÂY DỰNG CÔNG CỤ NỘI BỘ ĐỊNH KIỂU PYDANTIC Ở PHASE 4; TRIỂN KHAI MCP SERVER CHỈ ĐỌC TẠI PHASE 8.**
1. **Tại Phase 4:** Toàn bộ các công cụ `search_products`, `get_product_details`, `compare_products`, `check_inventory`, `search_policy` được định nghĩa bằng thư viện `@tool` của LangChain/LangGraph kết hợp Pydantic V2 Schema, gọi trực tiếp vào Application Service trong cùng tiến trình Backend.
2. **Tại Phase 8:** Xây dựng một MCP Server độc lập sử dụng official Python MCP SDK (`mcp`), cung cấp giao diện chuẩn chỉ đọc (Read-Only) cho các client bên ngoài như Claude Desktop, Antigravity IDE hoặc Cursor để truy xuất catalog và chính sách.

---

## 4. Hệ Quả & Đánh Đổi (Consequences)

### Tích cực (Positive):
* Đơn giản hóa kiến trúc, giúp vòng lặp Agent phản hồi nhanh hơn, loại bỏ hoàn toàn các lỗi mất kết nối RPC trung gian.
* Đảm bảo tính nhất quán dữ liệu và an ninh: Quyền sở hữu người dùng và khóa bi quan CSDL được quản lý tập trung tại Backend Service.

### Tiêu cực & Biện pháp khắc phục (Risks & Mitigations):
* *Rủi ro:* Cần viết thêm adapter chuyển đổi nếu muốn expose công cụ ra MCP ở Phase 8.
* *Biện pháp:* Thiết kế tầng Application Service theo mô hình Clean Architecture; khi làm Phase 8, MCP Tool chỉ là một Controller mỏng gọi lại chính các hàm Service đã có.
