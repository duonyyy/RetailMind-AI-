# ADR-006: Kiến Trúc Modular Monolith Thay Vì Vi Dịch Vụ Phân Tán (Microservices)

**Mã quyết định:** `ADR-006`  
**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Trạng thái:** `SUPERSEDED IN PART BY ADR-007` (Kế thừa nguyên lý Modular Monolith trong NestJS Commerce Core và tách Python Agent Runtime chuyên biệt)  
**Ngày quyết định:** 2026-10-20  
**Tác giả:** Technical Architecture Team & Antigravity Pair Programmer  
**Căn cứ:** `prompt_sections/04_PHASE_PLAN.md` (Gate P0-G06) & Được kế thừa/nâng cấp tại `ADR-007` (CR-001)  

---

## 1. Ngữ Cảnh & Vấn Đề Kỹ Thuật (Context & Problem Statement)

Khi thiết kế nền tảng RetailMind AI, cần lựa chọn phong cách kiến trúc hệ thống tổng thể:
1. **Lựa chọn A (Distributed Microservices):** Chia nhỏ hệ thống thành 5–7 microservices độc lập (Auth Service, Catalog Service, Inventory Service, Order Service, RAG Service, Agent Service), mỗi service có database riêng và giao tiếp qua HTTP/gRPC hoặc Message Broker (Kafka/RabbitMQ).
2. **Lựa chọn B (Modular Monolith):** Đóng gói toàn bộ các Bounded Contexts vào một ứng dụng backend FastAPI duy nhất, chia tách rõ ràng thành các package mô-đun độc lập, dùng chung một cơ sở dữ liệu PostgreSQL có phân tách lược đồ và một Qdrant instance trong Docker Compose.

---

## 2. Phân Tích So Sánh Các Giải Pháp (Options Comparison)

| Tiêu chí | Lựa chọn A: Microservices Phân Tán | Lựa chọn B: Modular Monolith |
|---|---|---|
| **Độ phức tạp vận hành & Triển khai** | Cực kỳ phức tạp. Đòi hỏi Kubernetes, Service Mesh, API Gateway, Distributed Tracing, CI/CD đa repo. | **Tối giản & Tinh gọn**. Một lệnh `docker compose up --build` khởi động toàn bộ hệ thống trong vài giây. |
| **Giao dịch phân tán & Toàn vẹn dữ liệu** | Đòi hỏi Saga Pattern hoặc Two-Phase Commit (2PC) khi chốt đơn và trừ tồn kho; rủi ro cao về tính nhất quán cuối cùng (Eventual Consistency). | **Hỗ trợ Transaction ACID chuẩn mực**. Kiểm tra tồn kho, khóa bi quan và tạo đơn hàng diễn ra trong cùng 1 transaction CSDL. |
| **Độ trễ hệ thống (Network Latency)** | Cao (mỗi bước gọi tool của Agent phải qua nhiều bước hop mạng HTTP/gRPC giữa các service). | **Cực thấp**. Các mô-đun giao tiếp trực tiếp qua In-Memory Python Function Calls (< 1ms). |
| **Chi phí hạ tầng & Môi trường Local** | Tốn nhiều RAM (> 8–16GB), khó chạy mượt mà trên laptop của kỹ sư hoặc máy tính phỏng vấn. | **Tiết kiệm tài nguyên**. Chạy hoàn hảo trên máy tính tiêu chuẩn (RAM 8–16GB, CPU 4 cores). |

---

## 3. Quyết Định Kiến Trúc (Decision)

**Quyết định: CHỌN PHONG CÁCH KIẾN TRÚC MODULAR MONOLITH (NGUYÊN KHỐI PHÂN MÔ-ĐUN).**
1. **Một ứng dụng Backend FastAPI duy nhất:** Mã nguồn được tổ chức thành các thư mục module độc lập theo Bounded Context: `identity`, `catalog`, `inventory`, `recommendation`, `commerce`, `agents`, `knowledge`, `support`, `evaluation`.
2. **Giao tiếp liên module qua Service Interface:** Không cho phép module này truy vấn trực tiếp bảng CSDL của module khác. Mọi tương tác dữ liệu phải thông qua Public Application Service của module sở hữu.
3. **Một Cơ sở dữ liệu PostgreSQL trung tâm:** Tất cả 22 bảng CSDL nằm trong cùng một database PostgreSQL 16+, cho phép tận dụng triệt để Transaction ACID và khóa bi quan của cơ sở dữ liệu quan hệ.

---

## 4. Hệ Quả & Đánh Đổi (Consequences)

### Tích cực (Positive):
* Phù hợp tối đa với tiêu chuẩn phát triển nhanh, dễ kiểm thử tự động, dễ trình diễn (Demo/Portfolio) và phỏng vấn kỹ thuật.
* Dễ dàng tái cấu trúc (Refactoring): Nếu trong tương lai cần tách một module thành microservice riêng (ví dụ: tách RAG Service), việc phân tách ranh giới đã được chuẩn bị sẵn thông qua các Interface độc lập.

### Tiêu cực & Biện pháp khắc phục (Risks & Mitigations):
* *Rủi ro:* Lập trình viên có thể vô tình import chéo mã nguồn vi phạm ranh giới module.
* *Biện pháp:* Cấu hình linter (Ruff / Flake8-Import-Conventions) và viết bài kiểm thử kiến trúc (Architecture Tests) trong CI để chặn đứng các câu lệnh import chéo trái phép giữa các module.
