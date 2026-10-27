# ADR-004: Sử Dụng Truy Vấn SQL Tham Số Hóa Định Kiểu Thay Vì Text-to-SQL

**Mã quyết định:** `ADR-004`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `APPROVED FOR BASELINE`  
**Ngày quyết định:** 2026-10-20  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** `prompt_sections/04_PHASE_PLAN.md` (Gate P0-G06) & `AGENTS.md` (Tôn chỉ tối thượng)  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Để AI Agent có thể tìm kiếm máy tính trong danh mục catalog (`UC02`, `UC03`), nhiều hệ thống thử nghiệm cho phép LLM tự động sinh câu truy vấn SQL thô dựa trên lược đồ cơ sở dữ liệu (kỹ thuật **Text-to-SQL**).
Cần đưa ra quyết định kiến trúc chính thức giữa:
1. **Lựa chọn A (Text-to-SQL):** Cấp schema cho LLM và cho phép LLM tự viết câu lệnh `SELECT ...` để thực thi trực tiếp trên cơ sở dữ liệu.
2. **Lựa chọn B (Typed Tools & Parameterized SQL):** LLM chỉ được phép trích xuất tham số có cấu trúc (Pydantic Schema); Backend Service sử dụng TypeORM (NestJS 12+) để thực thi các câu truy vấn SQL tham số hóa (Parameterized Statements) tối ưu hóa sẵn B-Tree Index.

---

## 2. Phân Tích So Sánh Các Giải Pháp (Options Comparison)

| Tiêu chí | Lựa chọn A: Text-to-SQL (LLM tự viết SQL) | Lựa chọn B: Typed Tools & Parameterized SQL |
|---|---|---|
| **An ninh mạng (SQL Injection)** | Nguy cơ cực kỳ nghiêm trọng. Kẻ xấu có thể dùng Prompt Injection để ép LLM sinh lệnh `UNION SELECT`, `DROP TABLE`, hoặc đọc trộm bảng `users`. | **Miễn nhiễm 100% với SQL Injection**. Các tham số được bind an toàn qua Prepared Statements của TypeORM / PostgreSQL Driver. |
| **Bảo vệ quyền riêng tư & Đa người dùng** | Rất khó kiểm soát IDOR. LLM có thể "quên" mệnh đề `WHERE user_id = :id`, dẫn tới rò rỉ dữ liệu giữa các khách hàng. | Kiểm tra quyền sở hữu cấp dòng (Row Ownership) được thực thi cưỡng chế tại tầng Application Service. |
| **Hiệu năng & Tối ưu hóa Index** | LLM thường sinh ra các câu query phức tạp, quét toàn bộ bảng (Seq Scan), không tận dụng được chỉ mục Partial Index hoặc Composite B-Tree. | **Tối ưu hóa B-Tree 100%**. Câu lệnh SQL được kỹ sư tối ưu hóa trước, có `EXPLAIN ANALYZE` kiểm chứng. |
| **Tính ổn định (Reliability)** | Dễ gặp lỗi cú pháp SQL, sai tên cột hoặc ảo giác quan hệ giữa các bảng. | Lỗi tham số được bắt ngay tại tầng Pydantic Validator trước khi gửi tới CSDL. |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: BÁC BỎ VÀ CẤM TUYỆT ĐỐI KỸ THUẬT TEXT-TO-SQL (`BR-007`). BẮT BUỘC SỬ DỤNG TYPED TOOLS & PARAMETERIZED SQL.**
1. **LLM Proposes, Service Executes:** AI Agent chỉ đóng vai trò phân tích ngôn ngữ tự nhiên để điền dữ liệu vào `ProductSearchFilters` DTO.
2. **Không cấp quyền Database Client cho LLM:** LLM không có thông tin kết nối CSDL (DB Connection String), không được cấp quyền thực thi lệnh SQL trực tiếp.
3. **Truy vấn tham số hóa:** Mọi truy vấn lọc theo khoảng giá VNĐ, dung lượng RAM, CPU, thương hiệu đều thực thi qua các hàm Repository chuẩn mực của TypeORM trong NestJS Backend.

---

## 4. Hệ Quả & Đánh Đổi (Consequences)

### Tích cực (Positive):
* Triệt tiêu hoàn toàn bề mặt tấn công SQL Injection và rủi ro rò rỉ dữ liệu cá nhân.
* Hiệu năng truy vấn catalog luôn ổn định dưới 20ms nhờ tận dụng tối đa chỉ mục `ix_variants_active_price` và `ix_variants_ram`.

### Tiêu cực & Biện pháp khắc phục (Risks & Mitigations):
* *Rủi ro:* Cần viết mã nguồn cho nhiều hàm Tool hơn so với việc để LLM tự do truy vấn.
* *Biện pháp:* Thiết kế `ProductSearchFilters` đủ linh hoạt với nhiều trường tùy chọn (`min_price`, `max_price`, `min_ram_gb`, `brand`, `use_case`).
