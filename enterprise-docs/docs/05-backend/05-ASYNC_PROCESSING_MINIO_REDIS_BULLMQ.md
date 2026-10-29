# 05 — Async Processing Pipeline: MinIO, Redis & BullMQ Architecture

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `enterprise-docs/docs/05-backend/05-ASYNC_PROCESSING_MINIO_REDIS_BULLMQ.md`  
**Công nghệ**: NestJS 12+, BullMQ 5+, Redis 7+, MinIO S3 Object Storage, Qdrant Vector DB  
**Căn cứ đặc tả**: `AGENTS.md`, `ADR-007`, `ADR-008` & `04-RAG_FLOW.md`  
**Trạng thái**: Approved for Architecture Baseline (Production 2026 Edition)  

---

## 1. Đặt Vấn Đề: Tại Sao Cần Pipeline Xử Lý Bất Đồng Bộ?

Trong hệ thống bán lẻ quy mô lớn, các tác vụ xử lý tài liệu tri thức (RAG Document Ingestion) đòi hỏi tài nguyên CPU và thời gian xử lý rất lớn:
1. **Bóc tách tài liệu lớn**: Các file quy chế bảo hành, cam kết đổi trả (PDF / Markdown) có dung lượng lớn.
2. **Phân đoạn 11 bậc (Hierarchical Chunking)**: Thuật toán cắt đệ quy theo thể thức Nghị định 30/2020/NĐ-CP mất từ vài trăm mili-giây đến vài giây.
3. **Sinh Embedding & Nạp Vector**: Gọi mô hình Dense Embedding và đẩy hàng trăm vector vào Qdrant tốn nhiều thời gian và phụ thuộc độ trễ mạng.

Nếu thực thi đồng bộ (Synchronous) trong HTTP Request của Admin:
- Request sẽ bị treo (Timeout 30s–60s).
- Gây nghẽn luồng Event Loop của Node.js, làm chậm các request mua sắm của khách hàng.

$\longrightarrow$ **Giải pháp chuẩn Enterprise:** Tách rời quy trình lưu trữ và xử lý thông qua bộ ba **MinIO (Object Storage) + Redis (State Broker) + BullMQ (Async Job Queue)**.

---

## 2. Kiến Trúc Bộ Ba: MinIO, Redis & BullMQ

```mermaid
flowchart TD
    %% ==========================================
    %% COLOR PALETTE & STYLES
    %% ==========================================
    classDef adminStyle fill:#0F172A,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC,rx:8,ry:8
    classDef nestStyle fill:#0F172A,stroke:#EA284E,stroke-width:2.5px,color:#FFE4E6,rx:8,ry:8
    classDef storageStyle fill:#1E293B,stroke:#F59E0B,stroke-width:2px,color:#FEF3C7,rx:8,ry:8
    classDef queueStyle fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#D1FAE5,rx:8,ry:8
    classDef dbStyle fill:#1F1329,stroke:#EC4899,stroke-width:2px,color:#FCE7F3,rx:8,ry:8

    Admin["Quản Trị Viên (Admin)"]:::adminStyle

    subgraph NestAPI ["NestJS Core API (Port 4000)"]
        direction TB
        UploadCtrl["Upload Controller<br/>POST /api/v1/admin/policies/upload"]:::nestStyle
        IngestProducer["IngestionProducer<br/>shared/queue & features/ingestion"]:::nestStyle
    end

    subgraph StorageTier ["Tầng Lưu Trữ Đối Tượng & Hàng Đợi"]
        direction LR
        MinIO["MinIO Object Storage<br/>(Bucket: retailmind-documents • SHA-256)"]:::storageStyle
        RedisStore["Redis 7+ Broker & Cache<br/>(Queue Storage & Rate Limiter)"]:::storageStyle
    end

    subgraph WorkerTier ["Tầng Xử Lý Ngầm (BullMQ Worker)"]
        BullWorker["IngestionProcessor (@Processor)<br/>• attempts: 3 • backoff: exponential<br/>• 11-Tier Splitter (NĐ 30/2020/NĐ-CP)"]:::queueStyle
    end

    subgraph DestinationTier ["Tầng Đích (SSOT & Search Index)"]
        QD[("Qdrant Vector DB<br/>Idempotent Deletion & Upsert")]:::dbStyle
        PG[("PostgreSQL 16+<br/>document_versions (status='published')")]:::dbStyle
    end

    %% ==========================================
    %% WORKFLOW
    %% ==========================================
    Admin ==>|1. Tải lên file MD/PDF chính sách| UploadCtrl
    UploadCtrl ==>|2. Lưu file gốc băm SHA-256| MinIO
    UploadCtrl ==>|3. Đẩy Job vào Queue| IngestProducer
    IngestProducer ==>|4. Ghi nhận Task| RedisStore
    UploadCtrl -->>|5. Phản hồi tức thì 202 Accepted| Admin

    RedisStore ==>|6. Lấy Job bất đồng bộ| BullWorker
    BullWorker ==>|7. Đọc Buffer văn bản gốc| MinIO
    BullWorker -->|8. Cắt 11 bậc NĐ 30 & Embedding| BullWorker
    BullWorker ==>|9. Xóa vector cũ theo policy_id & Upsert vector mới| QD
    BullWorker ==>|10. Cập nhật version thành published| PG
```

---

## 3. Đặc Tả Chi Tiết Từng Thành Phần

### 3.1. MinIO Object Storage (Lưu Trữ Bất Biến & Băm SHA-256)
* **Vị trí mã nguồn**: `core-api/src/shared/storage/minio.service.ts`
* **Nhiệm vụ**:
  - Lưu trữ tài liệu gốc không thể chỉnh sửa (Immutable Raw Files).
  - Tính toán băm toàn vẹn `checksum_sha256` trước khi lưu để phát hiện trùng lặp hoặc tệp bị can thiệp.
  - Tự động tạo Bucket `retailmind-documents` khi khởi động ứng dụng.
  - Cung cấp Presigned URL tải file an toàn với thời hạn ngắn.

### 3.2. Redis In-Memory Broker & Cache
* **Vị trí mã nguồn**: `core-api/src/shared/redis/redis.service.ts`
* **Nhiệm vụ**:
  - Đóng vai trò là Message Broker và State Store cho BullMQ Queue.
  - Cache tạm thời danh mục Laptop hot và thông số kỹ thuật (TTL 300s).
  - Kiểm soát giới hạn tần suất truy cập (Rate Limiting) và bảo vệ phiên.

### 3.3. BullMQ Queue & Worker (Tiến Trình Xử Lý Phân Cấp NĐ 30)
* **Vị trí mã nguồn**:
  - Producer: `core-api/src/features/ingestion/ingestion.producer.ts`
  - Processor: `core-api/src/features/ingestion/ingestion.processor.ts`
* **Cấu hình xử lý**:
  - **Tên Queue**: `document-ingestion`
  - **Số lần thử lại (Attempts)**: 3 lần khi có lỗi mạng tạm thời.
  - **Backoff Strategy**: Exponential backoff với khoảng chờ ban đầu 2000ms.
  - **Thuật toán phân mảnh**: Cắt đệ quy theo 11 bậc thể thức hành chính Việt Nam (Nghị định 30/2020/NĐ-CP):
    $$\text{Phần} \rightarrow \text{Chương} \rightarrow \text{Mục} \rightarrow \text{Tiểu mục} \rightarrow \text{Điều} \rightarrow \text{Khoản} \rightarrow \text{Điểm} \dots$$
  - **Idempotent Vector Ingestion**: Gọi lệnh xóa các điểm cũ theo `policy_id` trên Qdrant trước khi nạp điểm mới, triệt tiêu 100% stale vectors.

---

## 4. Cấu Hình Biến Môi Trường (Environment Variables)

| Tên Biến | Giá Trị Mặc Định | Mô Tả |
|---|---|---|
| `REDIS_HOST` | `redis` (hoặc `localhost`) | Địa chỉ máy chủ Redis |
| `REDIS_PORT` | `6379` | Cổng dịch vụ Redis |
| `MINIO_ENDPOINT` | `minio` (hoặc `localhost`) | Địa chỉ máy chủ MinIO |
| `MINIO_PORT` | `9000` | Cổng S3 API của MinIO |
| `MINIO_ACCESS_KEY` | `minioadmin` | Tài khoản quản trị MinIO |
| `MINIO_SECRET_KEY` | `minioadmin` | Mật khẩu truy cập MinIO |
| `MINIO_BUCKET` | `retailmind-documents` | Bucket lưu trữ chính sách |

---

## 5. Kiểm Thử Độ Tin Cậy & Fallback Graceful

* **Offline Fallback**: Khi chạy unit test hoặc trong môi trường dev chưa bật Redis/MinIO, `RedisService` và `MinioStorageService` tự động chuyển sang chế độ Graceful Fallback (không làm crash ứng dụng NestJS).
* **Quản trị giám sát**: BullMQ UI (hoặc Bull Board) có thể tích hợp để theo dõi trực quan số lượng jobs `active`, `completed`, `failed` trong thời gian thực.
