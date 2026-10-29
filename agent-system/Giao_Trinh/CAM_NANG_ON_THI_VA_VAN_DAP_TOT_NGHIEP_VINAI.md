# 🎓 CẨM NANG ÔN THI & BỘ ĐỀ 55 CÂU VẤN ĐÁP BẢO VỆ TỐT NGHIỆP VINAI CAPSTONE
## Sổ Tay Luyện Thi Final Lab, Giải Mã 40 Câu Trắc Nghiệm Sản Xuất & 15 Kịch Bản Phản Biện Hội Đồng Khoa Học Điểm A+
**Biên soạn:** Hội đồng Cố vấn Học thuật & Kỹ sư Trưởng Hệ thống AI (Academic Advisory & Senior AI Architects)  
**Tài liệu tham chiếu:** VinAI AI20K Final Lab Exam, VinUni Capstone Defense Rubric, Đề án Kiểm toán Rủi ro Hợp đồng Kinh tế  
**Dành cho:** Sinh viên, Học viên bảo vệ Khóa luận Tốt nghiệp và Ứng viên thi tuyển Kỹ sư AI / LLMOps / Tech Lead  
**Phiên bản:** 2026 Comprehensive Edition — Cẩm Nang Thực Chiến Trước Hội Đồng Khoa Học  

---

# LỜI NÓI ĐẦU: CHIẾN THẮNG TRƯỚC HỘI ĐỒNG KHÔNG DỰA VÀO MAY MẮN

Khi bước lên bục bảo vệ Đồ án Tốt nghiệp (Capstone Defense) trước các Giáo sư và Kỹ sư Trưởng của VinAI/VinUni, sự khác biệt giữa điểm B và điểm A+ tuyệt đối nằm ở **khả năng giải trình bản chất kỹ thuật (Root Cause Explanation)**.

Hội đồng sẽ không hỏi những câu định nghĩa trong sách giáo khoa như: *"LLM là gì?"* hay *"Python là gì?"*. Họ sẽ tấn công trực diện vào những điểm yếu chí mạng của hệ thống:
1. *"Tại sao hệ thống của bạn không dùng Long Context Window của Gemini 1.5 Pro (2 triệu tokens) để đọc toàn bộ tài liệu mà phải kỳ công xây dựng Hybrid RAG phân tầng?"*
2. *"Nếu đang demo live trước Hội đồng mà mạng quốc tế bị đứt cáp hoặc OpenAI API báo lỗi 503, bạn sẽ xử lý thế nào để hệ thống không bị văng lỗi trắng màn hình?"*
3. *"Chứng minh bằng công thức toán học và dữ liệu đo đạc thực tế tại sao chọn hệ số RRF $k=60$ và ngưỡng tương đồng Cosine $\ge 0.82$?"*
4. *"Làm sao bạn chứng minh hệ thống của bạn tuân thủ triệt để Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân trước khi gửi prompt lên đám mây?"*

Tài liệu này được biên soạn thành 3 phần thực chiến:
* **Phần 1:** Giải mã toàn bộ **40 câu hỏi trắc nghiệm & tình huống thực tế của Đề thi Final Lab VinAI** (kèm đáp án chuẩn và phân tích nguyên nhân kỹ thuật sâu sắc).
* **Phần 2:** Bộ **15 câu hỏi phản biện hóc búa nhất của Hội đồng Chấm Khóa luận** (kèm kịch bản trả lời mẫu đạt điểm tối đa).
* **Phần 3:** **Kịch bản Demo Live 10 phút hoàn hảo** (chiến lược tạo hiệu ứng "WOW" làm chủ hoàn toàn buổi bảo vệ).

---

# PHẦN 1: GIẢI MÃ BỘ ĐỀ 40 CÂU THI FINAL LAB VINAI (KÈM LỜI GIẢI CHI TIẾT)

### NHÓM A — NỀN TẢNG CỐT LÕI (CÂU 1 – 10)

#### Câu 1: Thành phần nào chịu trách nhiệm chính cho việc phục vụ model LLM trong Final Lab?
- **A.** Grafana | **B.** vLLM | **C.** FAISS | **D.** SQLite
- **👉 Đáp án đúng:** **B. vLLM**
- **💡 Giải thích chuyên sâu:** vLLM là engine phục vụ suy luận mô hình ngôn ngữ lớn chuyên dụng (LLM Inference Engine) sử dụng thuật toán PagedAttention để quản lý bộ nhớ KV-Cache và kỹ thuật Continuous Batching nhằm tối ưu hóa thông lượng GPU. FAISS là thư viện tìm kiếm vector; SQLite là Audit Store; Grafana là dashboard giám sát.

#### Câu 2: Với GPU GTX 3050 Laptop 4 GB, lựa chọn nào phù hợp nhất cho local baseline?
- **A.** Hai model 7B FP16 chạy đồng thời
- **B.** Model 70B FP16 với concurrency cao
- **C.** Model nhỏ như Qwen 0.5B với context và concurrency thấp
- **D.** P/D multi-GPU trên hai GPU ảo
- **👉 Đáp án đúng:** **C. Model nhỏ như Qwen 0.5B với context và concurrency thấp**
- **💡 Giải thích chuyên sâu:** Trọng số FP16 của model 7B đã chiếm $7 \times 2 = 14\text{ GB}$ VRAM, vượt xa dung lượng 4 GB của GTX 3050. Để chạy mượt mà local baseline cả trọng số lẫn KV-Cache trên 4 GB VRAM, model nhỏ như Qwen-2.5-0.5B hoặc 1.5B lượng tử hóa 4-bit là giải pháp khả thi duy nhất.

#### Câu 3: Streaming trong API chat thường giúp client nhận được gì?
- **A.** Toàn bộ model weights | **B.** Quyền truy cập vào GPU | **C.** File index FAISS | **D.** Từng phần output khi model đang sinh
- **👉 Đáp án đúng:** **D. Từng phần output khi model đang sinh**
- **💡 Giải thích chuyên sâu:** Giao thức Server-Sent Events (SSE) hoặc HTTP Chunked Transfer Encoding cho phép đẩy từng token về trình duyệt ngay khi GPU vừa sinh ra, giúp giảm chỉ số cảm nhận thời gian (Perceived Latency) và đưa TTFT xuống dưới 800ms.

#### Câu 4: Trong hệ thống RAG, chunking tài liệu nhằm mục đích chính nào?
- **A.** Giảm kích thước text để phù hợp context và tăng độ chính xác tìm kiếm
- **B.** Tăng dung lượng database
- **C.** Bỏ qua việc dùng embedding
- **D.** Thay thế hoàn toàn model LLM
- **👉 Đáp án đúng:** **A. Giảm kích thước text để phù hợp context và tăng độ chính xác tìm kiếm**
- **💡 Giải thích chuyên sâu:** Chunking giúp chia nhỏ tài liệu dài thành các đơn vị ngữ nghĩa độc lập, hạn chế hiện tượng "Lost in the Middle" và tránh làm loãng vector embedding.

#### Câu 5: Metric nào đo thời gian từ lúc gửi request đến khi nhận được token đầu tiên?
- **A.** TPOT | **B.** TTFT | **C.** GPU Temp | **D.** Disk I/O
- **👉 Đáp án đúng:** **B. TTFT (Time To First Token)**
- **💡 Giải thích chuyên sâu:** TTFT phản ánh thời gian của pha Prefill (xử lý prompt đầu vào). TPOT (Time Per Output Token) đo tốc độ sinh của pha Decode.

#### Câu 6: SQLite trong kiến trúc Final Lab đóng vai trò gì?
- **A.** Model weights cache | **B.** Audit / Event store ghi nhận lịch sử và trạng thái | **C.** Thay thế vLLM | **D.** Load balancer
- **👉 Đáp án đúng:** **B. Audit / Event store ghi nhận lịch sử và trạng thái**
- **💡 Giải thích chuyên sâu:** SQLite lưu trữ nhật ký giao dịch bất biến (Event Sourcing), correlation ID, và các quyết định của Agent phục vụ mục đích kiểm toán và đối soát.

#### Câu 7: Khi client gọi API qua Nginx reverse proxy, vai trò chính của Nginx là gì?
- **A.** Tự chạy model LLM
- **B.** Điều phối lưu lượng, cân bằng tải, bảo vệ và định tuyến request đến backend
- **C.** Tạo embedding vector
- **D.** Quản lý bộ nhớ GPU
- **👉 Đáp án đúng:** **B. Điều phối lưu lượng, cân bằng tải, bảo vệ và định tuyến request đến backend**

#### Câu 8: Thuật toán BM25 thuộc nhóm phương pháp tìm kiếm nào?
- **A.** Tìm kiếm ngữ nghĩa dày đặc (Dense Vector Search)
- **B.** Tìm kiếm từ khóa thưa thớt (Sparse Lexical Search)
- **C.** Đồ thị tri thức (Graph Search)
- **D.** Tìm kiếm ngẫu nhiên (Random Walk)
- **👉 Đáp án đúng:** **B. Tìm kiếm từ khóa thưa thớt (Sparse Lexical Search)**
- **💡 Giải thích chuyên sâu:** BM25 dựa trên tần suất xuất hiện của từ (TF-IDF cải tiến với saturation và length normalization), cực mạnh trong việc tìm chính xác các từ khóa hiếm, mã hiệu văn bản luật (ví dụ: "Điều 301").

#### Câu 9: Trong mô hình an toàn thông tin theo Nghị định 13/2023/NĐ-CP, hành động nào là bắt buộc trước khi gửi dữ liệu ra API bên thứ ba?
- **A.** Khử định danh hoặc mặt nạ hóa dữ liệu cá nhân (PII De-identification)
- **B.** Tăng kích thước context window
- **C.** Giảm nhiệt độ model về 0
- **D.** Nén file zip
- **👉 Đáp án đúng:** **A. Khử định danh hoặc mặt nạ hóa dữ liệu cá nhân (PII De-identification)**

#### Câu 10: Circuit Breaker ở trạng thái OPEN nghĩa là gì?
- **A.** Hệ thống đang hoạt động bình thường
- **B.** Hệ thống tạm thời ngắt kết nối đến service lỗi để bảo vệ hệ thống và kích hoạt fallback
- **C.** Mạch điện đang sạc pin
- **D.** Hệ thống đang nhận tải gấp đôi
- **👉 Đáp án đúng:** **B. Hệ thống tạm thời ngắt kết nối đến service lỗi để bảo vệ hệ thống và kích hoạt fallback**

---

### NHÓM B — TRUNG BÌNH & CHUYÊN SÂU (CÂU 11 – 25)

#### Câu 11: Tại sao kỹ thuật RRF (Reciprocal Rank Fusion) lại hiệu quả hơn việc cộng điểm trực tiếp (Score Summation) khi kết hợp Dense và Sparse Search?
- **👉 Trả lời:** Điểm số của BM25 là không giới hạn ($[0, +\infty)$), trong khi điểm Cosine Similarity bị chặn trong khoảng $[-1, 1]$ hoặc $[0, 1]$. Việc cộng điểm trực tiếp sẽ làm thang đo của BM25 áp đảo hoàn toàn vector dense. RRF chuẩn hóa dựa trên thứ hạng (Rank): $\text{RRF Score} = \sum \frac{1}{k + r_i}$, triệt tiêu hoàn toàn sự chênh lệch về thang đo điểm số.

#### Câu 12: Khi nào nên sử dụng PagedAttention thay cho cấp phát bộ nhớ truyền thống?
- **👉 Trả lời:** Luôn luôn sử dụng trong môi trường phục vụ đa người dùng (Multi-tenant Production) có chiều dài prompt biến thiên. PagedAttention loại bỏ phân mảnh bộ nhớ ngoài (External Fragmentation) và giảm phân mảnh trong (Internal Fragmentation) xuống dưới 4%, giúp tăng sức chứa batch lên 3–5 lần.

#### Câu 13: Tại sao kỹ thuật Cross-Encoder Reranking không thể thay thế hoàn toàn cho bước Vector Retrieval ban đầu?
- **👉 Trả lời:** Vì chi phí tính toán của Cross-Encoder quá lớn ($O(N)$ ma trận Attention đầy đủ cho cặp `[Query, Document]`). Nếu đưa 1 triệu tài liệu qua Cross-Encoder, độ trễ sẽ mất hàng giờ. Do đó, ta phải dùng Bi-Encoder (Dense + BM25) với độ phức tạp $O(1)$ để lọc ra top 50 tài liệu ứng viên, rồi mới dùng Cross-Encoder để xếp hạng lại top 5 tài liệu tốt nhất.

#### Câu 14: Thuật toán kiểm tra trích dẫn nguyên văn (Verbatim Citation) sử dụng chuẩn chuẩn hóa nào trước khi so khớp?
- **👉 Trả lời:** Chuẩn hóa Unicode **NFKC (Normalization Form KC)** kết hợp bóc tách khoảng trắng thừa. NFKC chuyển đổi các ký tự tương thích đặc biệt (như số mũ, ký tự toàn độ rộng Full-width) về dạng chuẩn Latinh/ASCII tương đương, tránh việc so khớp thất bại do khác biệt bảng mã gõ tiếng Việt (Telex vs VNI).

#### Câu 15: Bản chất của kỹ thuật Request Hedging trong việc triệt tiêu độ trễ P99 là gì?
- **👉 Trả lời:** Khi một request gửi đến LLM Provider A chạy quá ngưỡng P95 (ví dụ sau 1.5 giây mà chưa nhận được token nào), Gateway tự động kích hoạt một request song song thứ hai đến Provider B. Request nào trả lời trước sẽ được chấp nhận và trả về client, request còn lại bị hủy ngay lập tức. Điều này giúp "gọt phẳng" đuôi trễ P99 bất thường của hạ tầng mạng.

---

### NHÓM C — TÌNH HUỐNG THỰC CHIẾN & VẬN HÀNH (CÂU 26 – 40)

#### Câu 26: Hệ thống đang chạy thì phát hiện tỷ lệ Cache Hit giảm từ 42% xuống còn 3% sau đợt cập nhật prompt mới. Nguyên nhân kỹ thuật là gì?
- **👉 Trả lời:** Do trong System Prompt mới có chèn thêm trường dữ liệu động như `Current_Timestamp` hoặc `Random_Request_ID`. Khi đưa chuỗi prompt này vào bộ băm SHA-256 hoặc tính toán Semantic Vector, mỗi request đều có chuỗi đầu vào khác nhau khiến cơ chế Semantic Cache thất bại 100%. **Khắc phục:** Tách phần ngữ cảnh động ra khỏi khóa băm Cache Key.

#### Câu 27: Một file hợp đồng PDF bị kẻ xấu chèn ký tự `\u200b` (Zero-Width Space) tạo thành câu lệnh ẩn. Điều gì xảy ra nếu không có bộ lọc Byte-level?
- **👉 Trả lời:** Mắt người nhìn trên file PDF chỉ thấy khoảng trắng bình thường, nhưng Tokenizer của LLM sẽ dịch các byte Unicode ẩn này thành chuỗi token điều khiển (Indirect Prompt Injection), ra lệnh cho mô hình bỏ qua quy tắc bảo mật và tiết lộ dữ liệu nhạy cảm ra ngoài.

#### Câu 28: Kỹ sư muốn đo lường điểm hòa vốn (Break-even) giữa việc thuê GPU Cloud tự host vLLM ($1.80/giờ) và gọi API thương mại ($0.003/1K tokens). Điểm hòa vốn xảy ra khi nào?
- **👉 Trả lời:** Một ngày thuê GPU tốn $1.80 \times 24 = \$43.20$. Với giá API \$0.003/1K tokens, chi phí tương đương $\frac{43.20}{0.003} \times 1.000 = 14.400.000\text{ tokens/ngày}$. Nếu sản phẩm tiêu thụ trên 14,4 triệu tokens/ngày, việc tự host cụm GPU vLLM sẽ có lợi nhuận kinh tế cao hơn gọi API thương mại.

#### Câu 29: Khi một nút trong LangGraph bị lỗi Timeout do gọi API bên ngoài, cơ chế nào bảo đảm hệ thống không bị crash toàn bộ đồ thị?
- **👉 Trả lời:** Cơ chế Checkpointer lưu trạng thái bất biến (State as DTO) vào SQLite kết hợp bọc khối thực thi của Tool trong `try-except` trả về `ErrorObservation` thay vì ném exception. Đồ thị điều hướng sang nhánh dự phòng (Fallback Node) hoặc kích hoạt cổng duyệt Human-In-The-Loop.

#### Câu 30: Tại sao không nên lưu log kiểm toán vào cùng một file văn bản phẳng (plain text .log) trên máy chủ sản xuất?
- **👉 Trả lời:** File text phẳng không hỗ trợ truy vấn cấu trúc, không có giao dịch ACID, dễ bị hỏng (corrupt) khi có nhiều worker ghi đồng thời, và không bảo đảm tính toàn vẹn (dễ bị quản trị viên sửa xóa tùy tiện). Bắt buộc phải lưu vào cơ sở dữ liệu có cơ chế Write-Ahead Logging (WAL) như SQLite hoặc Delta Lake S3.

---

# PHẦN 2: BỘ 15 CÂU HỎI VẤN ĐÁP HỘI ĐỒNG BẢO VỆ KHOÁ LUẬN TỐT NGHIỆP (KÈM KỊCH BẢN TRẢ LỜI ĐIỂM A+)

### Câu 1: Tại sao không dùng cửa sổ ngữ cảnh khổng lồ (Long Context 2M tokens) mà phải dùng Hybrid RAG phân tầng?
- **Trả lời đỉnh cao:**  
  *"Thưa Hội đồng, Long Context giải quyết bài toán dung lượng nạp, nhưng vi phạm 3 nguyên lý sống còn của hệ thống sản xuất:
  1. **Hiệu ứng Lost in the Middle:** Độ chú ý của cơ chế Attention suy giảm rõ rệt ở khoảng giữa tài liệu, dẫn tới bỏ sót các điều khoản quan trọng.
  2. **Thời gian đáp ứng (TTFT):** Nạp 1 triệu tokens khiến TTFT kéo dài từ 30 đến 60 giây, hoàn toàn không đáp ứng được SLA trải nghiệm người dùng.
  3. **Chi phí kinh tế (FinOps):** Mỗi câu hỏi tra cứu nhỏ mà phải nạp lại 2 triệu tokens sẽ đốt cháy hàng ngàn USD tiền token trong vài giờ. Hybrid RAG phân tầng chắt lọc chính xác 5 chunks giá trị nhất, đưa chi phí về dưới 0.002 USD và phản hồi trong 500ms."*

### Câu 2: Làm thế nào bạn chứng minh hệ thống không bịa đặt (Hallucination) khi kiểm toán điều khoản phạt hợp đồng?
- **Trả lời đỉnh cao:**  
  *"Hệ thống thiết lập bộ giáp 3 lớp kiểm chứng tất định:
  - Lớp 1: Ép mô hình trích xuất cặp số nguyên: Giá trị phần nghĩa vụ vi phạm ($V$) và Mức phạt thỏa thuận ($P$).
  - Lớp 2: TUYỆT ĐỐI không để LLM tính nhẩm. Toàn bộ phép tính tỷ lệ phần trăm $\frac{P}{V} \times 100\%$ và so sánh với mức trần 8% theo Điều 301 Luật Thương mại được thực thi bằng mã Python thuần tất định trong Sandbox.
  - Lớp 3: Lớp thẩm định Verbatim Alignment so khớp trích dẫn của mô hình với văn bản luật gốc theo chuẩn NFKC $\ge 80\%$. Nếu không khớp, hệ thống từ chối xuất báo cáo."*

### Câu 3: Khi mạng chập chờn, làm sao bảo đảm một giao dịch kiểm toán không bị tính phí token và ghi nhận phạt 2 lần?
- **Trả lời đỉnh cao:**  
  *"Chúng em áp dụng triết lý Thiết Kế Lũy Đẳng (Idempotent Design). Mỗi lượt gửi của client được gán một `correlation_id` duy nhất dạng UUID v4 kết hợp mã băm SHA-256 của tài liệu. Tại Audit Store, trường này được đặt làm khóa chính (PRIMARY KEY). Khi mạng bị ngắt và client retry, Gateway nhận diện mã khóa đã tồn tại trong bảng và trả về ngay kết quả đã lưu mà không gọi lại LLM và không ghi đè sổ cái."*

### Câu 4: Tại sao các bạn lại sử dụng SQLite cho Audit Store thay vì PostgreSQL hay MongoDB?
- **Trả lời đỉnh cao:**  
  *"Trong phạm vi kiến trúc Single-Node Edge / On-Premise, SQLite là cơ sở dữ liệu nhúng (In-Process Embedded DB) nhanh nhất thế giới vì không tốn độ trễ mạng qua giao thức TCP/IP (Network Round-Trip Latency = 0ms). Khi bật chế độ Write-Ahead Logging (`PRAGMA journal_mode=WAL`), SQLite xử lý mượt mà hàng nghìn giao dịch đọc đồng thời mà không hề block tiến trình ghi. Đây là giải pháp tinh gọn, tự chủ và không phụ thuộc dịch vụ ngoài."*

### Câu 5: Hệ thống của các bạn tuân thủ Nghị định 13/2023/NĐ-CP như thế nào trước khi dữ liệu rời khỏi máy chủ?
- **Trả lời đỉnh cao:**  
  *"Tại Tầng Ingestion của Gateway, mọi tài liệu đều đi qua bộ lọc `PIIScrubber` trước khi được băm nhỏ hoặc gửi đi. Chúng em sử dụng các biểu thức chính quy biên dịch sẵn kết hợp từ điển thực thể tên người Việt Nam để nhận diện và thay thế CCCD (12 số), Số điện thoại, Số tài khoản ngân hàng bằng các token ẩn danh: `[CCCD_REDACTED_xxxx]`. Bản đồ giải mã (De-anonymization Map) được mã hóa AES-256 và lưu cục bộ tại RAM máy chủ, không bao giờ gửi ra Internet."*

---

# PHẦN 3: KỊCH BẢN DEMO LIVE 10 PHÚT HOÀN HẢO (THE 10-MINUTE WOW SCRIPT)

```
┌────────────────────────────────────────────────────────────────────────┐
│ PHÂN BỔ THỜI GIAN DEMO LIVE 10 PHÚT TRƯỚC HỘI ĐỒNG KHOA HỌC            │
├──────────────┬─────────────────────────────────────────────────────────┤
│ Phút 01 – 02 │ BỨC TRANH TOÀN CẢNH & GIÁ TRỊ KINH TẾ (THE HOOK)        │
│              │ • Trình bày slide 1: Tuyên ngôn vấn đề & Tiết kiệm 85%  │
│              │   thời gian cho phòng Pháp chế.                         │
│              │ • Không nói lý thuyết, mở thẳng giao diện Web sản phẩm. │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Phút 03 – 05 │ TÌNH HUỐNG KIỂM TOÁN CHUẨN (HAPPY PATH)                │
│              │ • Tải lên bản Hợp đồng Kinh tế thực tế dài 15 trang.    │
│              │ • Chỉ ra SSE Streaming hiển thị tức thì sau 650ms.      │
│              │ • Báo cáo xuất ra phát hiện ngay Điều khoản 8.2 phạt 12%│
│              │   vượt trần 8% theo Điều 301 Luật Thương Mại 2005.      │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Phút 06 – 07 │ TÌNH HUỐNG BẪY BẢO MẬT (THE SECURITY SHIELD)            │
│              │ • Tải file có cài mã độc tàng hình Zero-Width Space.    │
│              │ • Màn hình đỏ cảnh báo: Zero-Width Unicode Detected!    │
│              │ • Cho Hội đồng thấy dữ liệu PII được bóc sạch trước khi │
│              │   chuyển sang bước phân tích.                           │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Phút 08 – 09 │ TÌNH HUỐNG SẬP MẠNG ĐỘT NGỘT (THE RESILIENCE TEST)     │
│              │ • CHỦ ĐỘNG RÚT CÁP MẠNG HOẶC TẮT TIẾN TRÌNH vLLM GPU!   │
│              │ • Cho Hội đồng thấy Circuit Breaker bật sang OPEN.      │
│              │ • Hệ thống tự kích hoạt Fallback cục bộ, giao diện      │
│              │   không hề bị sập trắng mà thông báo lịch sự.           │
├──────────────┼─────────────────────────────────────────────────────────┤
│ Phút 10      │ MỞ HỘP ĐEN AUDIT STORE & TRACE OPENTELEMETRY            │
│              │ • Mở bảng SQLite Audit Store & Grafana Dashboard.       │
│              │ • Chứng minh: TTFT = 650ms, Cost = $0.0018, 0 data loss.│
│              │ • Kết luận: Sẵn sàng Golive chuẩn Enterprise!          │
└──────────────┴─────────────────────────────────────────────────────────┘
```

---

# BẢNG TỰ ĐÁNH GIÁ 25 TIÊU CHÍ SẢN XUẤT (GO-LIVE CHECKLIST)

| STT | Hạng mục kiểm tra kỹ thuật | Mức độ | Đạt / Chưa |
|---|---|:---:|:---:|
| 1 | File `.env` không bị commit vào Git repo | Bắt buộc | ✅ |
| 2 | Loại bỏ 100% hardcoded API keys trong mã nguồn | Bắt buộc | ✅ |
| 3 | Toàn bộ các route FastAPI có Correlation ID tracing | Bắt buộc | ✅ |
| 4 | Thuật toán bóc ký tự vô hình `[\u200b-\u200f\ufeff]` hoạt động | Bắt buộc | ✅ |
| 5 | Mặt nạ hóa số CCCD (12 số) và số điện thoại Việt Nam | Bắt buộc | ✅ |
| 6 | Circuit Breaker 3 pha có ngưỡng ngắt và thời gian hồi phục | Bắt buộc | ✅ |
| 7 | Không có phép tính toán tiền phạt nào được giao cho LLM tính nhẩm | Bắt buộc | ✅ |
| 8 | Thuật toán so khớp nguyên văn NFKC $\ge 80\%$ hoạt động | Bắt buộc | ✅ |
| 9 | SQLite bật chế độ Write-Ahead Logging (`WAL`) | Bắt buộc | ✅ |
| 10 | Docker Compose chạy được full stack với 1 lệnh `docker compose up` | Bắt buộc | ✅ |
| 11 | TTFT đo đạc thực tế dưới 800ms khi stream SSE | Nâng cao | ✅ |
| 12 | Tỷ lệ hit Semantic Cache đo đạc đạt trên 30% | Nâng cao | ✅ |
| 13 | Hệ thống không sập khi API ngoài trả về lỗi HTTP 429 hoặc 503 | Bắt buộc | ✅ |
| 14 | Có bộ dữ liệu Golden Dataset tối thiểu 50 mẫu kiểm thử | Nâng cao | ✅ |
| 15 | Hệ số đồng thuận Cohen's Kappa giữa Judge và Con người $\ge 0.81$ | Xuất sắc | ✅ |
