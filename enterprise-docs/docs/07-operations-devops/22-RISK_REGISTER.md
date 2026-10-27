# 22 — Risk Register & Operational Mitigation Strategy

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/07-operations-devops/22-RISK_REGISTER.md`  
**Căn cứ đặc tả**: `docs/research/security-reliability.md`, `ADR-001`, `ADR-004` & `ADR-005`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Sổ Đăng Ký Rủi Ro Hệ Thống (System Risk Register)

| Mã Rủi Ro | Tên Rủi Ro & Tình Huống Cụ Thể | Phân Loại | Xác Suất | Tác Động | Mức Độ | Biện Pháp Phòng Ngừa Kỹ Thuật (Mitigation) | Người Chịu Trách Nhiệm |
|:---:|---|:---:|:---:|:---:|:---:|---|:---:|
| **`RSK-01`** | **Ảo giác giá & tồn kho của AI (Hallucination)**: LLM tự bịa ra giá bán thấp hơn hoặc cam kết còn hàng trong khi kho đã hết. | AI Safety | High | **Critical** | **CỰC KỲ CAO** | Cấm Text-to-SQL; Agent bắt buộc gọi Typed Tools; PostgreSQL là SSOT duy nhất; cấm AI tự chốt đơn (ADR-004). | Lead AI Engineer |
| **`RSK-02`** | **Bán vượt tồn kho (Overselling / Race Condition)**: Nhiều khách hàng cùng bấm chốt mua 1 máy cuối cùng dẫn đến số lượng tồn kho âm. | Concurrency | High | **Critical** | **CỰC KỲ CAO** | Khóa bi quan dòng: `SELECT ... FOR UPDATE` trong Transaction; sắp xếp tăng dần theo `(store, variant)` chống Deadlock (ADR-005). | Database Architect |
| **`RSK-03`** | **Truy cập trái phép dữ liệu người khác (IDOR)**: Đổi ID trên URL hoặc request body để xem giỏ hàng hoặc hủy đơn của khách hàng khác. | Security | High | **Critical** | **CỰC KỲ CAO** | Bắt buộc kiểm soát quyền sở hữu tại ORM: `WHERE customer_id = current_user.id`; cấm nhận `customer_id` từ client payload. | Backend Lead |
| **`RSK-04`** | **Rò rỉ dữ liệu cá nhân PII tiếng Việt**: Khách hàng nhập CCCD, SĐT trong đoạn chat và bị gửi sang máy chủ LLM ngoại vi. | Compliance | High | **High** | **CAO** | Middleware lọc PII tiếng Việt tự động nhận diện và ẩn danh hóa CCCD, SĐT, Email trước khi gửi dữ liệu ra ngoài (NĐ 13/2023). | Security Lead |
| **`RSK-05`** | **Sự cố nghẽn mạng LLM Provider (HTTP 429/503)**: Dịch vụ OpenAI / LLM bị quá tải hoặc mất mạng làm tê liệt tính năng chat. | Reliability | Medium | **High** | **CAO** | Triển khai Circuit Breaker 3 trạng thái + Exponential Backoff with Jitter; chuyển sang Deterministic Fallback Response khi ngắt mạch. | SRE / DevOps Lead |
| **`RSK-06`** | **Cạn kiệt Connection Pool CSDL**: Mở transaction giữ khóa kho quá lâu trong lúc stream SSE gây nghẽn PostgreSQL. | Performance | Medium | **High** | **CAO** | AsyncPG pool tối đa 30 kết nối; Transaction timeout 5s; đóng transaction ngay khi chốt xong trước khi trả response. | Database Architect |
| **`RSK-07`** | **Trượt giá giữa Preview và Confirm**: Giá sản phẩm bị Admin thay đổi tăng lên trong lúc khách hàng đang điền thông tin chốt đơn. | Commerce | Medium | **Medium** | **TRUNG BÌNH**| Cấp Signed Preview Token (HMAC-SHA256) cam kết giá bất biến trong 10 phút. Quá 10 phút bắt buộc preview lại. | Commerce Lead |
| **`RSK-08`** | **Trích dẫn chính sách chưa xuất bản**: Tác tử RAG trích dẫn điều khoản bảo hành từ bản nháp `draft` hoặc phiên bản cũ `superseded`. | RAG Quality | Medium | **Medium** | **TRUNG BÌNH**| Cơ chế xác minh 2 chiều: Retrieval Service bắt buộc kiểm tra trạng thái `document_versions.status == 'published'` tại PostgreSQL. | RAG Engineer |

---

## 2. Quy Trình Ứng Phó Sự Cố Khẩn Cấp (Incident Response Playbook)

* **Sự cố P1 (Critical - Bán vượt tồn / Rò rỉ dữ liệu)**:
  - *Thời gian phản hồi*: Dưới 15 phút.
  - *Hành động*: Ngắt tính năng chốt đơn, kích hoạt chế độ bảo trì giao dịch, kiểm tra khóa bi quan và audit log khôi phục số lượng tồn kho.
* **Sự cố P2 (Degraded - LLM Provider quá tải)**:
  - *Thời gian phản hồi*: Dưới 30 phút.
  - *Hành động*: Kích hoạt Circuit Breaker, chuyển hướng khách hàng sang sử dụng bộ lọc danh mục trực tiếp, kiểm tra quota API key.
