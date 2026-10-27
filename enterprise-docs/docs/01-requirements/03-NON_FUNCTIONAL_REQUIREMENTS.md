# 03 — Non-Functional Requirements (NFR) Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `docs/01-requirements/03-NON_FUNCTIONAL_REQUIREMENTS.md`  
**Căn cứ đặc tả**: `prompt_sections/01_PRODUCT_AND_REFERENCES.md` (Mục 1.2) & `03_PRIVACY_AND_SECURITY.md`  
**Trạng thái**: Approved for Architecture Baseline  

---

## 1. Nguyên Tắc Định Lượng Hóa Yêu Cầu Phi Chức Năng

Mọi yêu cầu phi chức năng trong dự án RetailMind AI bắt buộc phải **đo lường được bằng các chỉ số kỹ thuật chính xác (Measurable Metrics)** kèm ngưỡng chấp nhận (Thresholds) rõ ràng, tuyệt đối không sử dụng các từ ngữ định tính mơ hồ.

---

## 2. Bảng Danh Mục Yêu Cầu Phi Chức Năng Định Lượng

| Mã NFR | Danh mục (Category) | Tiêu chí & Chỉ số Đo lường (Metric Target) | Điều kiện Kiểm thử & Ngữ cảnh | Phương pháp Đo lường / Công cụ |
|:---:|---|---|---|---|
| **`NFR-PERF-001`** | **Hiệu năng Đọc API** | Thời gian phản hồi trung bình $P95 < 200\text{ms}$; $P99 < 400\text{ms}$ | Cho 95% các truy vấn danh mục sản phẩm và xem chi tiết biến thể | K6 Load Testing / Locust |
| **`NFR-PERF-002`** | **Hiệu năng Giao dịch Ghi** | Thời gian tạo đơn hàng giả lập $P95 < 600\text{ms}$ | Khi có khóa dòng bi quan (`SELECT ... FOR UPDATE`) và ghi nhận Idempotency | K6 Concurrency Suite |
| **`NFR-AGENT-001`**| **Độ trễ phản hồi AI (TTFT)** | Thời gian xuất hiện token đầu tiên $P95 < 800\text{ms}$ | Giao thức SSE Streaming từ khi client gửi prompt đến ký tự đầu tiên | Browser Navigation Timing / SSE Client |
| **`NFR-AGENT-002`**| **Thời gian chạy Tool** | Tổng thời gian thực thi Tool nội bộ $P95 < 50\text{ms}$ | Các công cụ `search_products`, `check_inventory` gọi qua NestJS 12+ Internal Gateway | OpenTelemetry Span Duration |
| **`NFR-RAG-001`**  | **Truy xuất Vector Qdrant** | Độ trễ tìm kiếm ngữ nghĩa $P95 < 80\text{ms}$ | Tập chỉ mục HNSW Cosine Distance với bộ lọc `visibility='public'` | Qdrant Client Telemetry |
| **`NFR-RAG-002`**  | **Độ chính xác trích dẫn** | Chỉ số Faithfulness Score $\ge 90\%$ trên tập Golden Dataset | Đối chiếu từng luận điểm câu trả lời với văn bản chính sách gốc | LLM-as-a-Judge / RAG Triad Suite |
| **`NFR-SEC-001`**  | **Bảo vệ PII tiếng Việt** | Tỷ lệ rò rỉ dữ liệu cá nhân $\mathbf{Leakage\_Rate = 0.00\%}$ | Tuyệt đối không để lọt số CCCD hoặc SĐT thật vào log hoặc sang Cloud LLM | Regex Verification Scanner |
| **`NFR-SEC-002`**  | **Chống SQL Injection** | 100% câu truy vấn CSDL sử dụng Parameterized SQL; $0\%$ Text-to-SQL | Quét toàn bộ mã nguồn không có nối chuỗi SQL động | Bandit / SonarQube / SAST |
| **`NFR-SEC-003`**  | **Chống Lỗ hổng IDOR** | 100% các API giỏ hàng, đơn hàng, chat phải kiểm tra quyền sở hữu | Từ chối truy cập chéo bằng mã lỗi `403 Forbidden` | Pytest / Jest Security Test Suite |
| **`NFR-SEC-004`**  | **Giới hạn Tần suất (Rate Limit)**| Tối đa 5 lần/phút cho login; tối đa 30 requests/phút cho endpoint AI Chat | Trả về mã lỗi `429 Too Many Requests` khi người dùng gửi quá hạn | NestJS ThrottlerGuard / Redis Token Bucket |
| **`NFR-DATA-001`** | **Toàn vẹn Dữ liệu Đơn hàng** | 0% đơn hàng bị trùng lặp do gửi đúp hoặc retry mạng | Kiểm tra qua khóa `idempotency_keys` và Transaction CSDL | Concurrency Double-Submit Test |
| **`NFR-DATA-002`** | **Độ chính xác Số học** | 100% số liệu tiền tệ VNĐ dùng kiểu `NUMERIC(18,0)` hoặc `Decimal` | Tuyệt đối không xuất hiện sai số làm tròn của số thực dấu phẩy động `FLOAT` | Unit Tests Kiểm Tra Tiền Tệ |
| **`NFR-RESIL-001`**| **Khả năng Tự phục hồi** | Chuyển mạch sang Mock Provider / SLM trong thời gian $< 20\text{ms}$ | Khi Cloud LLM gặp sự cố hoặc tỷ lệ lỗi upstream $> 50\%$ | Circuit Breaker Failure Injection Test |
| **`NFR-AVAIL-001`**| **Độ Sẵn sàng Hệ thống** | Cam kết đạt mức sẵn sàng $\ge 99.9\%$ Uptime trong môi trường kiểm thử | Chạy liên tục trong 7 ngày không xảy ra rò rỉ bộ nhớ (Memory Leak) | Docker Health Checks & Prometheus |
| **`NFR-SCALE-001`**| **Quản trị Kết nối CSDL** | Hỗ trợ tối thiểu 100 kết nối đồng thời với Connection Pool ổn định | Cấu hình TypeORM / pg pool: `max = 20`, `idleTimeoutMillis = 30000` | PostgreSQL PgBouncer / PG Stats |
| **`NFR-OBS-001`**  | **Khả năng Giám sát 360 độ**| 100% request và tool calling phải gắn mã `trace_id` và `request_id` | Định dạng log chuẩn Structured JSON, không chứa mật khẩu hay PII | OpenTelemetry Traces & Logs |

---

## 3. Chiến Lược Đo Kiểm & Cổng Chất Lượng Tự Động (Quality Gates)

1. **Cổng Kiểm Thử Hiệu Năng Tự Động (Performance CI Gate):**
   - Bộ kịch bản kiểm thử tải K6 chạy tự động trên môi trường staging trước khi release. Nếu thời gian phản hồi $P95 > 250\text{ms}$ đối với API đọc hoặc $P95 > 700\text{ms}$ đối với tạo đơn, hệ thống tự động đánh dấu `FAIL` và hủy bỏ triển khai.
2. **Cổng Kiểm Thử Rò Rỉ An Ninh (Security Regression Gate):**
   - Chạy 100 kịch bản kiểm thử cố tình đưa vào các chuỗi CCCD, SĐT và Prompt Injection độc hại. Nếu phát hiện bất kỳ chuỗi PII nào xuất hiện trong payload gửi ra ngoài, pipeline lập tức bị khóa (`BLOCKED`).
3. **Cổng Đánh Giá RAG Định Kỳ (Golden Set Benchmark):**
   - Chạy tập 50 câu hỏi chuẩn mực đánh giá độ trung thực của RAG. Chỉ khi điểm Faithfulness Score đạt $\ge 90\%$, phiên bản chỉ mục mới được phép chuyển trạng thái sang `published`.
