# Danh Mục Các Mẫu Phản Thiết Kế Bị Bác Bỏ (Rejected Architectural Anti-Patterns)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/research/rejected-patterns.md`  
**Căn cứ đặc tả:** `prompt_sections/01_PRODUCT_AND_REFERENCES.md` (Mục 3.1) & `RETAILMIND_AI_UNIFIED_CODEX_MASTER_PROMPT.md`  
**Giai đoạn:** Phase 0 (Research & Feasibility Audit)  
**Trạng thái:** CANDIDATE BASELINE (ANTI-PATTERNS FORMALLY REJECTED)  

---

## 1. Tôn Chỉ An Toàn & Đạo Đức Kỹ Nghệ

Trong quá trình nghiên cứu và khảo sát các kho mã nguồn mở trên GitHub, đội ngũ kỹ sư nhận thấy rất nhiều dự án mang danh "AI Agent" nhưng lại áp dụng những mẫu thiết kế vô cùng nguy hiểm. Để bảo đảm hệ thống RetailMind AI đạt tiêu chuẩn an toàn cấp Doanh nghiệp, tài liệu này **chính thức bác bỏ và nghiêm cấm áp dụng 10 mẫu phản thiết kế (Anti-Patterns)** sau đây trong toàn bộ dự án.

---

## 2. Bảng 10 Mẫu Phản Thiết Kế Bị Bác Bỏ Tuyệt Đối

| Mã Lỗi | Mẫu phản thiết kế (Anti-Pattern) | Nguồn gốc khảo sát | Lý do kỹ thuật bác bỏ (Technical Justification) | Giải pháp chuẩn mực của RetailMind AI |
|:---:|---|---|---|---|
| **REJ-01** | **Truy vấn CSDL tự do bằng Text-to-SQL** | `VIVPM/ecommerce-agent` | **Lỗ hổng SQL Injection thảm họa.** LLM có thể bị Jailbreak để sinh câu lệnh phá hoại: `DROP TABLE users;` hoặc đánh cắp dữ liệu mật. Ngoài ra, SQL tự sinh thường không tối ưu, gây Full Table Scan làm treo database. | **Thay thế 100% bằng Typed Tools:** Lập trình sẵn câu lệnh SQL tham số hóa (`:param`), chỉ nhận đầu vào đã được Pydantic kiểm tra kiểu nghiêm ngặt. |
| **REJ-02** | **Cấp quyền Shell / Docker cho Shopping Agent** | `NeoCyber05/Docker-Agent-CLI` | **Lỗ hổng thực thi mã từ xa (RCE).** Trợ lý tư vấn bán hàng của khách hàng không bao giờ được phép chạm tới hệ điều hành, shell script hay Docker Socket của máy chủ. | **Tuyệt đối không nhúng CLI tool vào Customer Agent.** Hệ thống chỉ cung cấp các tool đọc dữ liệu sản phẩm định kiểu sạch. |
| **REJ-03** | **Tự động chốt đơn mà không qua người dùng xác nhận** | Một số demo thương mại điện tử phong trào | **Ảo giác giao dịch (Hallucinated Mutations).** Mô hình có thể hiểu nhầm câu nói đùa của khách để tự động tạo đơn hàng thật, gây bức xúc và khiếu nại. | **Quy trình 2 pha (Two-Phase Commit with Human Sign-off):** AI chỉ sinh Preview Token; khách hàng bắt buộc phải tự tay nhấn nút **Xác Nhận (Confirm)** trên màn hình. |
| **REJ-04** | **Lưu giá bán và tồn kho vào Vector Database** | `ShivamBwaj/Ecommerce-RAG-Chatbot` | **Dữ liệu phân mảnh và sai lệch giao dịch.** Vector DB (như Qdrant hay Pinecone) là cơ sở dữ liệu phi quan hệ, tìm kiếm gần đúng, không có bảo đảm ACID, không hỗ trợ khóa dòng (`FOR UPDATE`). | **Tách biệt ranh giới rõ ràng:** PostgreSQL là nguồn chân lý duy nhất cho giá bán và tồn kho; Qdrant chỉ lưu văn bản chính sách bảo hành. |
| **REJ-05** | **Mở AI Chat ẩn danh không kiểm soát cho Guest** | Nhiều web demo công khai | **Tấn công cạn kiệt tài nguyên (Denial of Wallet).** Kẻ xấu có thể viết bot tự động spam hàng triệu prompt vào API chat ẩn danh, làm cạn kiệt ngân sách GPU hoặc tài khoản OpenAI trong vài giờ. | **AI Chat chỉ dành cho Customer đã đăng nhập:** Khách vãng lai (`Guest`) chỉ được sử dụng bộ lọc tìm kiếm sản phẩm và tra cứu FAQ tĩnh. |
| **REJ-06** | **Xé nhỏ kiến trúc thành Microservices quá sớm** | Phong trào chạy theo trào lưu | **Quá tải tài nguyên và bẫy phân tán.** Tạo ra hàng chục container độc lập (Docker Swarm/K8s, Kafka) làm trễ mạng tăng cao, phân tán transaction phức tạp và không thể chạy mượt mà trên laptop cá nhân (RAM 16GB). | **Modular Monolith First:** Một backend FastAPI duy nhất được module hóa sạch sẽ, kết hợp PostgreSQL và Qdrant, triển khai dễ dàng bằng một lệnh Docker Compose. |
| **REJ-07** | **Làm giả giao diện thanh toán & giao vận** | Một số dự án đồ án thiếu thực tế | **Tuyên bố gian dối và vi phạm chuẩn mực kỹ nghệ.** Tạo ra các form nhập thẻ Visa giả lập hoặc nút "Thanh toán thành công" ảo gây hiểu lầm cho người đánh giá. | **Minh bạch hóa 100%:** Ghi rõ nhãn `DEMO / SIMULATED ORDER`; đơn hàng chỉ dừng ở mức quản lý trạng thái giả lập nội bộ. |
| **REJ-08** | **Tự động duyệt thiết kế không cần con người (Auto-approval)** | Một số script tự động hóa AI | **Mất quyền kiểm soát kiến trúc.** AI Agent tự động đánh dấu `DONE` cho các tài liệu thiết kế CSDL mà con người chưa hề xem qua, dẫn đến việc xây dựng mã nguồn trên nền tảng sai lệch. | **Chốt chặn Gate P0 cứng:** Toàn bộ Design Baseline v1 bắt buộc phải có biên bản phê duyệt chính thức từ người dùng trước khi được chuyển sang Phase 1. |
| **REJ-09** | **Vòng lặp suy luận vô tận (Unbounded ReAct Loops)** | Các framework Agentic nguyên thủy | **Treo tiến trình và cháy ngân sách.** Khi gặp câu hỏi hóc búa hoặc tool trả về lỗi, Agent tiếp tục gọi lại chính tool đó hàng chục lần mà không dừng. | **Đóng khung số bước tối đa (`MAX_STEPS = 5`):** Khi chạm ngưỡng 5 bước mà chưa hoàn thành, hệ thống tự động kích hoạt cơ chế ngắt an toàn và tổng hợp câu trả lời cứu hộ. |
| **REJ-10** | **Ghi thẳng PII thô vào hệ thống Logs & Tracing** | Lỗi cẩu thả của nhiều lập trình viên | **Vi phạm pháp luật bảo vệ dữ liệu.** Ghi lại toàn bộ chuỗi prompt chứa số CCCD, SĐT, Email của khách hàng vào các tệp log mở của server hoặc gửi lên cloud. | **Chuẩn hóa Logging:** Toàn bộ thông tin cá nhân phải được bộ lọc PII che giấu hoặc mã hóa giả danh trước khi ghi nhận vào hệ thống OpenTelemetry hay audit ledger. |

---

## 3. Quy Tắc Kiểm Tra Vi Phạm Trong Mã Nguồn (Linter & Review Rule)

Trong các phase triển khai (Phase 1 đến Phase 9), nếu phát hiện bất kỳ đoạn code nào xuất hiện một trong các dấu hiệu sau:
1. Có chuỗi `SELECT` được nối chuỗi động với biến từ prompt của người dùng.
2. Có lệnh gọi `subprocess.run(["docker", ...])` hoặc `subprocess.run(["sh", ...])` trong các file của Agent.
3. Có hàm mutation (tạo đơn, sửa tồn kho) được gọi trực tiếp từ luồng stream SSE mà không thông qua xác nhận Token.

$\Longrightarrow$ **Kiểm thử tự động sẽ lập tức báo `FAIL`, hệ thống đánh dấu trạng thái `BLOCKED` và bắt buộc phải refactor ngay lập tức.**

---

## 4. Bảng Đối Soát 10 Lỗi Triển Khai Kỹ Thuật Bị Bác Bỏ (Code-Level Anti-Patterns Checklist)

Bên cạnh các phản khuôn mẫu cấp kiến trúc tổng thể, quy trình Code Review và CI/CD tự động của RetailMind AI kiên quyết từ chối merge bất kỳ Pull Request nào mắc phải 10 lỗi kỹ thuật dưới đây:

| Mã Lỗi | Lỗi Kỹ Thuật Bị Nghiêm Cấm | Hậu Quả Kỹ Thuật | Tiêu Chuẩn Thực Thi Bắt Buộc |
|:---:|---|---|---|
| **CODE-REJ-01** | **Nuốt lỗi bằng Bare Except (`except: pass`)** | Che giấu crash ngầm, làm tê liệt việc gỡ lỗi trong môi trường production. | Bắt exception chính xác (`APIError`, `ValidationError`), log cấu trúc và ném lỗi HTTP phù hợp. |
| **CODE-REJ-02** | **Hardcode Secret & API Key trong code** | Nguy cơ rò rỉ khóa OpenAI, mật khẩu CSDL lên GitHub. | Quản lý 100% bằng biến môi trường qua `pydantic_settings.BaseSettings`. |
| **CODE-REJ-03** | **Agent Tool không có Pydantic Schema định kiểu** | LLM truyền sai tham số gây exception runtime, dễ bị Prompt Injection. | Bắt buộc khai báo `BaseModel` của Pydantic v2 với `Field(description=...)` rõ ràng. |
| **CODE-REJ-04** | **Hàm dài > 50 dòng hoặc God Files dồn toàn bộ code** | Vi phạm Single Responsibility Principle, cực kỳ khó viết unit test. | Mỗi hàm $\le 50$ dòng, tách nhỏ module: `state.py`, `nodes.py`, `tools.py`. |
| **CODE-REJ-05** | **Dùng `float` hoặc Javascript `number` cho tiền tệ** | Sai số làm tròn dấu phẩy động làm thất thoát tiền trong thanh toán. | Bắt buộc dùng `Decimal` trong Python, `NUMERIC(18, 0)` trong Postgres, `string` trong TS. |
| **CODE-REJ-06** | **Không giới hạn vòng lặp Agent (`recursion_limit`)** | Agent lặp vô tận khi gặp câu hỏi khó, làm cháy hạn mức token. | Cấu hình cứng `recursion_limit=10` và giới hạn logic `MAX_STEPS = 5` với Fallback an toàn. |
| **CODE-REJ-07** | **LLM tự sinh lệnh ghi CSDL không qua con người xác nhận** | Ảo giác giao dịch, tự tạo đơn hàng hoặc trừ kho ngoài ý muốn. | Cơ chế 2 pha: LLM chỉ sinh `preview_token`, khách hàng nhấn nút Confirm mới thực thi ghi DB. |
| **CODE-REJ-08** | **Ghi thông tin cá nhân (PII) thô vào Logs/Traces** | Vi phạm Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15. | Quét Regex làm sạch CCCD/SĐT/Email trước khi gửi ra LLM và hệ thống OpenTelemetry. |
| **CODE-REJ-09** | **Đánh giá chất lượng bằng "Vibe Check" cảm tính** | Không phát hiện được suy thoái logic ngầm khi đổi prompt hoặc model. | Đo lường định lượng trên 50 mẫu Golden Dataset với điểm chuẩn Accuracy $\ge 85\%$. |
| **CODE-REJ-10** | **Kiểm tra và trừ kho không có khóa bi quan** | Rủi ro Oversell (bán vượt tồn) khi nhiều khách cùng mua sản phẩm cuối cùng. | Bắt buộc dùng `SELECT ... FOR UPDATE` trong Transaction CSDL kết hợp `Idempotency-Key`. |
