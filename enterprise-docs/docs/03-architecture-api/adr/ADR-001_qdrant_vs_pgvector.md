# ADR-001: Lựa Chọn Qdrant Làm Chỉ Mục Vector Thay Vì pgvector

**Mã quyết định:** `ADR-001`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `APPROVED FOR BASELINE`  
**Ngày quyết định:** 2026-10-20  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** `prompt_sections/04_PHASE_PLAN.md` (Gate P0-G06) & `prompt_sections/02_ARCHITECTURE_AND_DOMAIN.md`  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Hệ thống RetailMind AI cần một cơ sở dữ liệu vector để phục vụ tính năng Hỏi đáp Chính sách Bảo hành/Đổi trả (RAG - `UC05`) và tìm kiếm tài liệu sản phẩm.
Có hai hướng tiếp cận công nghệ chính:
1. **Lựa chọn A (pgvector):** Tích hợp phần mở rộng `pgvector` trực tiếp vào cơ sở dữ liệu PostgreSQL hiện có.
2. **Lựa chọn B (Qdrant):** Sử dụng một Vector Database chuyên dụng độc lập (Qdrant) chạy song song với PostgreSQL trong Docker Compose.

---

## 2. Phân Tích So Sánh Các Giải Pháp (Options Comparison)

| Tiêu chí so sánh | Lựa chọn A: `pgvector` (Extension trong PostgreSQL) | Lựa chọn B: `Qdrant` (Dedicated Vector DB) |
|---|---|---|
| **Hiệu năng HNSW & Tải đồng thời** | Chia sẻ tài nguyên CPU/RAM với các giao dịch tài chính ACID (khóa tồn kho, chốt đơn). Truy vấn vector nặng có thể làm chậm giao dịch chốt đơn. | Phân lập tài nguyên $100\%$. Qdrant được tối ưu hóa bằng Rust, hỗ trợ bộ nhớ đệm HNSW chuyên dụng cực nhanh. |
| **Hỗ trợ Hybrid Search (Dense + Sparse)** | Bị hạn chế; cần cài thêm extension hoặc kết hợp Full-Text Search phức tạp. | Hỗ trợ Native Dense + Sparse Vectors (BM25) và RRF (Reciprocal Rank Fusion) xuất sắc, sẵn sàng cho Phase 6. |
| **Lọc Payload theo Metadata (Payload Filtering)** | Dùng lệnh SQL chuẩn nhưng tốn chi phí join bảng. | Lọc trực tiếp trong quá trình duyệt đồ thị HNSW (Filtered HNSW Search) với độ trễ cực thấp. |
| **Tính độc lập & Nguồn chân lý** | Làm phình to dung lượng CSDL giao dịch; khó backup/restore độc lập. | **Tuân thủ đúng triết lý SSOT**: PostgreSQL lưu metadata gốc; Qdrant là chỉ mục phái sinh có thể xóa và tái tạo (rebuildable) bất kỳ lúc nào. |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: CHỌN QDRANT LÀM CHỈ MỤC TÌM KIẾM VECTOR THỨ CẤP.**
* **PostgreSQL 16+** tiếp tục là nguồn chân lý duy nhất (Single Source of Truth) lưu trữ metadata văn bản, phiên bản tài liệu (`document_versions`), và kiểm soát trạng thái xuất bản (`status = 'published'`).
* **Qdrant** được triển khai như một container độc lập trong `compose.yaml`, chỉ lưu trữ vector embeddings và payload định danh (`chunk_id`, `document_version_id`, `visibility`).
* **Cơ chế xác minh 2 chiều (`BR-021`):** Mọi kết quả tìm kiếm từ Qdrant bắt buộc phải đối chiếu trạng thái xuất bản tại PostgreSQL trước khi đưa vào context của LLM.

---

## 4. Hệ Quả & Đánh Đổi (Consequences)

### Tích cực (Positive):
1. **Phân lập tải hoàn hảo:** Các truy vấn hỏi đáp chính sách của khách hàng không gây ảnh hưởng đến hiệu năng xử lý giao dịch chốt đơn đồng thời trên PostgreSQL.
2. **Sẵn sàng cho Phase 6 (Advanced RAG):** Tận dụng được các năng lực tìm kiếm kết hợp Dense + Sparse và bộ lọc ACL mạnh mẽ của Qdrant mà không cần cấu hình thêm hạ tầng phức tạp.
3. **Phục hồi thảm họa dễ dàng:** Nếu Qdrant gặp sự cố, hệ thống có thể kích hoạt tiến trình Ingestion tái tạo toàn bộ vector từ các file văn bản gốc được lưu vết bất biến trong PostgreSQL.

### Tiêu cực & Biện pháp khắc phục (Risks & Mitigations):
* *Rủi ro:* Cần quản lý thêm một container trong Docker Compose.
* *Biện pháp:* Cấu hình chuẩn trong `compose.yaml`, cấp phát tài nguyên RAM hợp lý (512MB–1GB), cấu hình Docker Healthcheck để đảm bảo Backend chỉ kết nối khi Qdrant đã sẵn sàng.
