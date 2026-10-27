# 01 — Problem Definition & Scope Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tác giả**: Architecture & Engineering Team  
**Vai trò**: Senior Software Architect / Lead Business Analyst  
**Trạng thái**: Approved for Architecture Baseline  
**Tài liệu**: `docs/01-requirements/01-PROBLEM_AND_SCOPE.md`  

---

## 1. Bối cảnh & Khảo sát Hiện trạng (AS-IS vs TO-BE vs GAP)

### 1.1. Hiện trạng Thực tế (AS-IS)
- **Môi trường vận hành hiện tại**: Các website bán lẻ điện tử truyền thống chủ yếu dựa trên bộ lọc thuộc tính tĩnh cứng nhắc (faceted search), thiếu khả năng hiểu nhu cầu tự nhiên của khách hàng (ví dụ: *"tìm máy tầm 20 triệu chạy Docker và học AI"*).
- **Hạn chế kỹ thuật của chatbot thông thường**: Các chatbot tích hợp trên thị trường thường là "AI Wrapper" hời hợt, gọi thẳng prompt vào LLM không có kiểm soát; dễ bị ảo giác thông số máy, không nắm được số lượng tồn kho thực tế tại cửa hàng, sinh giá bán sai lệch hoặc ảo giác chính sách đổi trả.
- **Tác động tiêu cực**: Tỷ lệ rớt đơn cao, tranh chấp khiếu nại về bảo hành, nguy cơ bị khai thác lỗi bảo mật Prompt Injection và rò rỉ dữ liệu cá nhân (PII) của khách hàng.

### 1.2. Mục tiêu Thiết kế Hệ thống Mới (TO-BE)
- Xây dựng **RetailMind AI**: Nền tảng bán lẻ điện tử thông minh cấp doanh nghiệp (Enterprise-Grade), tích hợp trợ lý AI Agent tư vấn sâu sắc, kết hợp khả năng đọc cơ sở dữ liệu quan hệ và RAG ngữ nghĩa chính sách.
- **Phân tách ranh giới dữ liệu chuẩn mực**: PostgreSQL là nguồn chân lý duy nhất (Single Source of Truth) cho giá niêm yết, tồn kho cửa hàng và đơn hàng; Qdrant chỉ đóng vai trò chỉ mục vector thứ cấp (Secondary Retrieval Index) cho chính sách bảo hành.
- **Giao dịch thương mại an toàn tuyệt đối**: Khóa dòng bi quan (`SELECT ... FOR UPDATE`), đặt hàng nguyên tử có giữ chỗ (Atomic Reservation), chống gửi đúp bằng Idempotency Key, bảo vệ dữ liệu nhạy cảm theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15.

### 1.3. Phân tích Khoảng cách Cần Vượt qua (GAP Analysis)

| Khía cạnh đánh giá | Hiện trạng thông thường (AS-IS) | Mục tiêu hướng tới của RetailMind AI (TO-BE) | Giải pháp kỹ thuật (The GAP Bridge) |
|---|---|---|---|
| **Chân lý dữ liệu sản phẩm** | LLM tự nhớ hoặc truy xuất từ vector DB dễ sai giá | PostgreSQL là nguồn chân lý duy nhất cho giá & tồn kho | Cấm Text-to-SQL; sử dụng Typed Parameterized SQL Tools |
| **Bảo hành & Chính sách** | Chatbot tự bịa điều khoản (Hallucination) | RAG có trích dẫn nguồn xác thực hoặc từ chối trả lời | Kiểm tra đối chiếu `chunk_id` với bảng `document_versions` trong PostgreSQL |
| **Tranh chấp đồng thời tồn kho** | Dễ âm kho khi nhiều người cùng mua máy tồn = 1 | Triệt tiêu hoàn toàn Race Condition tại CSDL | Transaction ACID, khóa bi quan `FOR UPDATE` và quản lý `reserved_qty` |
| **An ninh & Quyền riêng tư** | Gửi nguyên văn prompt chứa CCCD/SĐT lên Cloud LLM | Che giấu PII tiếng Việt trước khi gửi ra ngoài | Bộ lọc PII Reversible Pseudonymization với token có TTL theo phiên |
| **Độ tin cậy hạ tầng AI** | Sập web khi upstream provider bị lỗi 429/503 | Khả năng tự phục hồi và chịu lỗi cao (Resilience) | Circuit Breaker 3 trạng thái, Exponential Backoff with Jitter, Mock Provider fallback |

---

## 2. Tuyên Bố Bài Toán (Problem Statement)

Trong lĩnh vực bán lẻ thiết bị công nghệ (Laptop, Điện máy), các doanh nghiệp đang đối mặt với 4 thách thức kỹ thuật nghiêm trọng:
1. **Ảo giác thông tin & Trách nhiệm pháp lý**: Mô hình AI tư vấn sai giá bán hoặc bịa đặt chính sách đổi trả, đẩy doanh nghiệp vào nguy cơ vi phạm Luật Bảo vệ quyền lợi người tiêu dùng.
2. **Tranh chấp dữ liệu trong khung giờ Flash Sale**: Hiện tượng nộp đơn trùng lặp do mạng lag hoặc nhiều người cùng tranh mua một thiết bị tồn kho duy nhất dẫn đến bán vượt số lượng tồn thực tế.
3. **Lỗ hổng an ninh Agentic (Prompt Injection & IDOR)**: Kẻ xấu lợi dụng câu lệnh prompt để ép Agent đọc trộm giỏ hàng của người khác hoặc thực thi mã độc lên hệ thống backend.
4. **Chi phí vận hành AI (FinOps Disaster)**: Lặp lại các truy vấn giống nhau hàng ngàn lần khiến chi phí gọi API đám mây tăng vọt không kiểm soát.

**RetailMind AI** được phát triển nhằm giải quyết triệt để 4 bài toán trên thông qua một kiến trúc phần mềm chuẩn mực, an toàn, có khả năng mở rộng linh hoạt.

---

## 3. Mục Tiêu Nghiệp Vụ Cốt Lõi (Business Goals)

Hệ thống cam kết đạt được các mục tiêu định lượng:
1. **Tính chính xác dữ liệu 100%**: 100% thông số kỹ thuật (RAM, CPU, Ổ cứng), giá bán và tồn kho đều được truy vấn từ bảng PostgreSQL demo; 0% trường hợp AI tự sinh giá.
2. **Toàn vẹn giao dịch tuyệt đối**: 0% đơn hàng bị trùng lặp do retry mạng; 0% tình trạng âm kho khi xảy ra tranh chấp đặt hàng đồng thời nhờ cơ chế khóa bi quan và Idempotency Key.
3. **Trích dẫn chính sách có bằng chứng $\ge 90\%$**: Các câu trả lời về bảo hành/đổi trả phải trích dẫn đúng mã phiên bản tài liệu hiện hành; tự động từ chối trả lời (*honest abstention*) khi thiếu tài liệu căn cứ.
4. **An ninh dữ liệu & PII 100%**: 0% số CCCD, SĐT hoặc Email thật của người dùng bị rò rỉ ra ngoài log hệ thống hoặc gửi thô sang máy chủ LLM bên thứ ba.
5. **Hiệu năng & Tối ưu chi phí**: Thời gian phản hồi token đầu tiên (TTFT) $P95 < 800\text{ms}$; giảm thiểu 70% chi phí gọi LLM thông qua bộ nhớ đệm và Mock Provider nội bộ phục vụ kiểm thử.

---

## 4. Phân Tích Các Tác Nhân Hệ Thống (Actors Analysis)

Hệ thống thiết lập ranh giới bất biến cho 3 nhóm tác nhân:

| Mã Actor | Tên Tác nhân | Vai trò trong hệ thống | Quyền hạn chính | Điểm đau & Rủi ro an ninh cần kiểm soát |
|:---:|---|---|---|---|
| **`ACT-GUEST`** | **Khách Vãng Lai**<br/>*(Guest)* | Người dùng ẩn danh truy cập website để tham khảo sản phẩm. | Duyệt danh mục sản phẩm, lọc theo giá/thông số, so sánh 2–4 máy, xem tồn kho công khai, đọc FAQ. | Chống tấn công quét dữ liệu hàng loạt (Scraping bot); không cấp phiên AI chat ẩn danh để tránh cạn kiệt tài nguyên GPU. |
| **`ACT-CUST`** | **Khách Hàng**<br/>*(Customer)* | Người dùng đã đăng ký/đăng nhập, mua sắm và nhận tư vấn. | Kế thừa quyền Guest; mở phiên chat tư vấn AI, quản lý giỏ hàng/yêu thích, preview và chốt đơn giả lập, tạo ticket hỗ trợ. | Nguy cơ IDOR truy cập chéo đơn hàng của người khác; nguy cơ Prompt Injection điều khiển Agent; bảo vệ PII cá nhân. |
| **`ACT-ADMIN`** | **Quản Trị Viên**<br/>*(Admin)* | Nhân sự vận hành kỹ thuật và quản trị hệ thống. | CRUD sản phẩm, biến thể, tồn kho; tải lên và lập chỉ mục chính sách RAG; xử lý ticket; xem telemetry & eval report. | Nguy cơ leo thang đặc quyền từ Customer lên Admin; bảo vệ API quản trị bằng phân quyền Token nghiêm ngặt. |

---

## 5. Ranh Giới Phạm Vi Dự Án (Scope Boundaries)

### 5.1. Trong Phạm Vi (In-Scope)
- Nền tảng bán lẻ máy tính xách tay demo tích hợp AI Shopping Assistant.
- Xác thực Stateless JWT Token cho Customer & Admin; phân quyền RBAC phân tầng.
- Quản lý danh mục sản phẩm, biến thể cấu hình (RAM/SSD) và tồn kho theo từng cửa hàng cụ thể.
- Trợ lý LangGraph tư vấn mua sắm, so sánh sản phẩm, gọi công cụ nội bộ định kiểu Pydantic.
- RAG đa tầng cho chính sách bảo hành/đổi trả sử dụng Qdrant và PostgreSQL Document Versioning.
- Luồng thương mại giả lập an toàn: Giỏ hàng $\rightarrow$ Preview $\rightarrow$ Xác nhận tường minh $\rightarrow$ Đơn hàng bất biến.
- Bộ kiểm thử tự động, Golden Dataset, Mock Provider tất định và quan sát OpenTelemetry.

### 5.2. Ngoài Phạm Vi (Out-of-Scope — Khóa Phạm Vi Tuyệt Đối)
- ❌ Không tích hợp cổng thanh toán tiền thật (VNPAY, MoMo, Stripe) $\rightarrow$ Toàn bộ mang nhãn `SIMULATED ORDER`.
- ❌ Không tích hợp đơn vị vận chuyển sống (GHN, Viettel Post) $\rightarrow$ Quản trị trạng thái đơn giả lập nội bộ.
- ❌ Không cào dữ liệu sống (Live Scraping) từ Thế Giới Di Động hay doanh nghiệp thật $\rightarrow$ Sử dụng 100% synthetic fixtures.
- ❌ Không phát triển phân hệ quản trị doanh nghiệp (ERP, chấm công, tính lương, Purchasing, Procurement).
- ❌ Không mở rộng vai trò tác nhân: Cấm tuyệt đối thêm các vai trò `Staff`, `Store Manager`, `Supplier`.
- ❌ Không sử dụng hạ tầng phân tán quá tải: Không dùng Kubernetes, Kafka, Celery cluster.
- ❌ Không cấp quyền Shell / Command Line / Docker socket cho AI Agent của khách hàng.
