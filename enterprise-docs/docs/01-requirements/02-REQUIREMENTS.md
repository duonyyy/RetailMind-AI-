# 02 — Functional Requirements (FR) Specification

**Dự án**: RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu**: `docs/01-requirements/02-REQUIREMENTS.md`  
**Căn cứ đặc tả**: `prompt_sections/01_PRODUCT_AND_REFERENCES.md` & `06_USE_CASE_SPECIFICATION.md`  
**Trạng thái**: Approved for Architecture Baseline  

---

## 1. Danh Mục Yêu Cầu Chức Năng Theo Module Nghiệp Vụ

Mỗi yêu cầu chức năng được định danh duy nhất theo cú pháp `FR-<MODULE>-<3_DIGITS>` phục vụ ma trận truy xuất nguồn gốc (Traceability Matrix).

---

### 1.1. Module Xác Thực & Danh Tính (`FR-AUTH-*` & `FR-USER-*`)

* **`FR-AUTH-001`**: Hệ thống cho phép người dùng đăng ký tài khoản khách hàng mới với `email` hợp lệ (không trùng lặp), `password` tối thiểu 8 ký tự và `full_name`. Mật khẩu bắt buộc được băm bằng thuật toán Argon2id hoặc Bcrypt với salt ngẫu nhiên.
* **`FR-AUTH-002`**: Hệ thống xác thực đăng nhập qua email và mật khẩu; cấp phát cặp token: `access_token` (JWT có TTL 15 phút) và `refresh_token` (TTL 7 ngày) khi thông tin đăng nhập chính xác.
* **`FR-AUTH-003`**: Hệ thống từ chối truy cập và trả về mã lỗi `401 Unauthorized` nếu thông tin đăng nhập không khớp hoặc token đã hết hạn / bị thu hồi.
* **`FR-AUTH-004`**: Hệ thống cho phép người dùng đăng xuất, ngay lập tức thu hồi và đưa `refresh_token` vào danh sách vô hiệu hóa.
* **`FR-AUTH-005`**: Cung cấp endpoint `GET /auth/me` trả về thông tin định danh và vai trò hiện tại của người dùng đang được xác thực, tuyệt đối không trả về trường `password_hash`.
* **`FR-AUTH-006`**: Khi tài khoản bị vô hiệu hóa (`is_active = false`), hệ thống lập tức từ chối mọi yêu cầu với mã lỗi `403 Forbidden` (`ACCOUNT_INACTIVE`) ngay cả khi JWT token vẫn còn thời hạn.
* **`FR-USER-001`**: Chỉ người dùng có vai trò `admin` mới được quyền truy cập danh sách người dùng toàn hệ thống, hỗ trợ phân trang và lọc theo vai trò.

---

### 1.2. Module Danh Mục Sản Phẩm & Biến Thể (`FR-CATALOG-*`)

* **`FR-CATALOG-001`**: Hệ thống cho phép `Guest` và `Customer` duyệt danh mục sản phẩm laptop công khai với bộ lọc đa tiêu chí: khoảng giá VNĐ (`min_price`, `max_price`), thương hiệu (`brand_id`), dung lượng RAM (`min_ram_gb`), hãng CPU (`cpu_brand`) và phân trang (`page`, `page_size`).
* **`FR-CATALOG-002`**: Xem chi tiết sản phẩm bao gồm thông tin tổng quan, danh sách các biến thể cấu hình (`variants`), thông số chi tiết (`specifications`) và giá bán niêm yết theo VNĐ.
* **`FR-CATALOG-003`**: Cho phép so sánh trực quan thông số đối đầu từ 2 đến 4 biến thể máy tính xách tay trên cùng một màn hình (kích thước, trọng lượng, CPU, GPU, RAM, Pin, Cổng kết nối).
* **`FR-CATALOG-004`**: Mọi truy vấn lọc danh mục sản phẩm phải được thực thi thông qua câu lệnh SQL tham số hóa (Parameterized Queries); nghiêm cấm ghép chuỗi SQL thô từ chuỗi tìm kiếm của người dùng.
* **`FR-CATALOG-005`**: Chỉ tác nhân `Admin` mới có quyền tạo mới, chỉnh sửa thông tin hoặc ẩn sản phẩm/biến thể. Khi xóa sản phẩm, hệ thống áp dụng cơ chế Soft Delete (`deleted_at`) để bảo toàn lịch sử đơn hàng cũ.

---

### 1.3. Module Tồn Kho Chi Nhánh (`FR-INVENTORY-*`)

* **`FR-INVENTORY-001`**: Hệ thống cho phép tra cứu số lượng tồn kho của một biến thể laptop theo từng cửa hàng demo cụ thể (`store_id`).
* **`FR-INVENTORY-002`**: Số lượng tồn kho khả dụng để bán được tính toán theo công thức bất biến:
  $$\text{available\_qty} = \text{on\_hand\_qty} - \text{reserved\_qty}$$
* **`FR-INVENTORY-003`**: Hệ thống từ chối mọi yêu cầu đặt hàng nếu số lượng khả dụng $\text{available\_qty} < \text{quantity}$ với mã lỗi `409 Conflict` (`OUT_OF_STOCK`).
* **`FR-INVENTORY-004`**: Chỉ `Admin` mới có quyền thực hiện thao tác nhập/xuất điều chỉnh số lượng tồn kho `on_hand_qty` tại các chi nhánh. Mọi thay đổi tồn kho bắt buộc phải ghi log kiểm toán vào bảng `audit_events`.

---

### 1.4. Module Trí Tuệ Nhân Tạo & Trợ Lý LangGraph (`FR-AGENT-*`)

* **`FR-AGENT-001`**: Hệ thống cung cấp trợ lý tư vấn mua sắm cá nhân hóa cho `Customer` đã đăng nhập thông qua giao diện hội thoại streaming Server-Sent Events (SSE).
* **`FR-AGENT-002`**: Trợ lý AI có khả năng hiểu ngữ cảnh tự nhiên của khách hàng, trích xuất nhu cầu thành Pydantic Schema định kiểu và tự động gọi các Tool đọc dữ liệu nội bộ (`search_products`, `get_product_details`, `compare_products`, `check_inventory`, `search_policy`).
* **`FR-AGENT-003`**: Mọi công cụ Agent gọi đều phải qua cổng kiểm định Pydantic Input Schema; hệ thống từ chối thực thi và yêu cầu Agent tự sửa lỗi nếu tham số truyền vào sai kiểu dữ liệu.
* **`FR-AGENT-004`**: Chu trình suy luận của Agent được giới hạn tối đa 5 bước lặp (`MAX_STEPS = 5`). Nếu vượt quá ngưỡng, hệ thống tự động kích hoạt cơ chế ngắt mạch an toàn và trả về câu trả lời tóm tắt cứu hộ.
* **`FR-AGENT-005`**: Lịch sử hội thoại được lưu trữ bền vững theo `thread_id` trong kho lưu trữ trạng thái (SQLite/PostgreSQL Checkpoint), cho phép khách hàng quay lại tiếp tục đoạn chat cũ.
* **`FR-AGENT-006`**: Khi đề xuất danh sách laptop, Agent bắt buộc phải kèm theo lý do gợi ý rõ ràng dựa trên dữ liệu cấu hình thực tế và hiển thị thẻ sản phẩm có thể bấm thêm vào giỏ.

---

### 1.5. Module Tri Thức & RAG Chính Sách Bảo Hành (`FR-RAG-*`)

* **`FR-RAG-001`**: Hệ thống cho phép `Admin` tải lên các văn bản chính sách bảo hành, đổi trả, hoàn tiền dưới định dạng TXT hoặc Markdown (kích thước $\le 5\text{MB}$).
* **`FR-RAG-002`**: Mỗi tài liệu tải lên được quản lý phiên bản nghiêm ngặt trong bảng `document_versions` với số phiên bản tăng dần (`version_no`), băm toàn vẹn SHA-256 và trạng thái xử lý (`draft`, `published`, `superseded`, `withdrawn`).
* **`FR-RAG-003`**: Tiến trình Ingestion tự động phân mảnh tài liệu theo cấu trúc tiêu đề điều khoản (Hierarchical Chunking), sinh vector nhúng và đẩy vào Qdrant kèm metadata (`chunk_id`, `policy_id`, `version_no`, `visibility`).
* **`FR-RAG-004`**: Khi người dùng hỏi về chính sách (UC05), hệ thống lọc Qdrant theo `visibility = 'public'` và bắt buộc kiểm tra chéo `chunk_id` trả về với metadata PostgreSQL xem phiên bản đó có đang ở trạng thái `published` hay không.
* **`FR-RAG-005`**: Câu trả lời của AI về chính sách bắt buộc phải kèm mã trích dẫn (`policy_id`, `section`, `chunk_id`). Nếu không tìm thấy bằng chứng thỏa mãn độ tương đồng, AI phải kích hoạt cơ chế từ chối trả lời (*honest abstention*).

---

### 1.6. Module Giao Dịch & Đơn Hàng Giả Lập (`FR-COMMERCE-*`)

* **`FR-COMMERCE-001`**: Mỗi `Customer` sở hữu duy nhất 01 giỏ hàng hoạt động (`carts.status = 'active'`). Khách hàng có quyền thêm biến thể, điều chỉnh số lượng hoặc xóa mục khỏi giỏ hàng.
* **`FR-COMMERCE-002`**: Cho phép tạo bản xem trước đơn hàng (Order Preview). Backend tính toán giá tạm tính, kiểm tra kho và cấp phát một `Signed Preview Token` có thời hạn 10 phút mang nhãn `DEMO / SIMULATED ORDER`. Bản Preview tuyệt đối không trừ kho hay sinh đơn hàng.
* **`FR-COMMERCE-003`**: Thao tác chốt đơn hàng giả lập (Confirm Order) bắt buộc phải do người dùng tự tay bấm nút trên giao diện và gửi kèm `Idempotency-Key` cùng `Preview Token`.
* **`FR-COMMERCE-004`**: Quá trình tạo đơn hàng thực thi bên trong một Database Transaction ACID duy nhất:
  - Khóa dòng bảng `inventories` bằng `SELECT ... FOR UPDATE`.
  - Tăng số lượng giữ hàng: `reserved_qty = reserved_qty + quantity`.
  - Tạo bản ghi trong `orders` với trạng thái `PENDING / SIMULATED`.
  - Tạo các bản ghi trong `order_items` lưu cố định giá snapshot (`sku_snapshot`, `unit_price_vnd`, `line_total_vnd`).
  - Ghi nhận `idempotency_keys` và chuyển trạng thái giỏ hàng sang `converted`.
* **`FR-COMMERCE-005`**: Nếu cùng một `Idempotency-Key` được gửi lại trong vòng 24 giờ, hệ thống trả về kết quả cũ kèm mã `200 OK` mà không thực hiện trừ kho lần hai.
* **`FR-COMMERCE-006`**: Khách hàng có quyền hủy đơn hàng ở trạng thái `PENDING`. Khi hủy đơn thành công, hệ thống mở transaction hoàn trả tồn kho nguyên tử (`reserved_qty = reserved_qty - quantity`) và chuyển đơn sang `CANCELLED`.

---

### 1.7. Module Hỗ Trợ Khách Hàng (`FR-SUPPORT-*`)

* **`FR-SUPPORT-001`**: Khách hàng có quyền tạo phiếu yêu cầu hỗ trợ (Ticket) khi gặp sự cố, bắt buộc phải liên kết với một đơn hàng hợp lệ của chính mình (`orders.id`).
* **`FR-SUPPORT-002`**: `Admin` có quyền xem danh sách ticket, phân loại độ ưu tiên, cập nhật trạng thái (`open`, `in_progress`, `resolved`) và gửi phản hồi cho khách hàng.

---

### 1.8. Module An Ninh & Bảo Vệ Quyền Riêng Tư (`FR-SEC-*`)

* **`FR-SEC-001`**: Hệ thống tự động lọc bỏ các ký tự vô hình (Zero-Width Unicode Characters) trong chuỗi prompt đầu vào để phòng chống mã độc tàng hình (Steganography injection).
* **`FR-SEC-002`**: Tích hợp bộ quét PII tiếng Việt, tự động nhận diện số CCCD (12 chữ số), Số điện thoại di động Việt Nam, Địa chỉ email và tên riêng; thay thế bằng mã giữ chỗ ngẫu nhiên có hiệu lực theo phiên làm việc trước khi gửi dữ liệu sang máy chủ LLM bên thứ ba.
* **`FR-SEC-003`**: Hệ thống áp dụng nguyên tắc cách ly quyền sở hữu dữ liệu (Row-Level Ownership Check); mọi yêu cầu truy xuất tài nguyên của khách hàng khác đều bị chặn đứng với mã lỗi `403 Forbidden`.
