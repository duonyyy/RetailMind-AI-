# Ma Trận Bằng Chứng Khảo Sát Kỹ Thuật (Research Evidence Matrix)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/research/evidence-matrix.md`  
**Căn cứ đặc tả:** `prompt_sections/01_PRODUCT_AND_REFERENCES.md` (Mục 3.1)  
**Giai đoạn:** Phase 0 (Research & Feasibility Audit)  
**Trạng thái:** CANDIDATE BASELINE (EVIDENCE AUDITED)  

---

## 1. Định Nghĩa Trạng Thái & Quyết Định Tiếp Nhận

Để bảo đảm tính trung thực tuyệt đối trong kỹ nghệ phần mềm và tránh tình trạng "tuyên bố trên giấy" (paper claims), mỗi thành phần khảo sát được gán nhãn nghiêm ngặt:

* **Trạng thái kiểm chứng (Verification Status):**
  - `VERIFIED_IN_CODE`: Đã đọc, phân tích chi tiết mã nguồn, đối chiếu dòng lệnh và chứng minh được cơ chế hoạt động.
  - `RUN_VERIFIED`: Đã chạy thử nghiệm thực tế trong môi trường độc lập, có log và đầu ra kiểm chứng.
  - `README_CLAIM_ONLY`: Tính năng chỉ xuất hiện trong mô tả README của tác giả, mã nguồn chưa hoàn thiện hoặc thiếu logic thực tế.
  - `NOT_RUN` / `BLOCKED`: Chưa đủ điều kiện môi trường hoặc phụ thuộc tài nguyên bên thứ ba để chạy.
* **Quyết định tiếp nhận (Adaptation Decision):**
  - `REUSE`: Tái sử dụng nguyên bản thư viện hoặc chuẩn giao thức chính thức.
  - `ADAPT`: Thích nghi hóa mô hình tư duy / giải thuật vào cấu trúc Modular Monolith của RetailMind AI.
  - `REIMPLEMENT`: Tự viết lại toàn bộ bằng công nghệ sạch (FastAPI + Pydantic + SQLAlchemy) để bảo đảm an toàn.
  - `REJECT`: Bác bỏ và cấm sử dụng vì vi phạm nguyên tắc an ninh hoặc gây quá tải hệ thống.

---

## 2. Bảng Ma Trận Bằng Chứng Chi Tiết (The Master Evidence Table)

| # | Năng lực kỹ thuật (Capability) | Nguồn tham khảo (Source URL) | Commit / Ref | Đường dẫn file chính xác (Exact file path) | Hàm / Lớp đại diện (Function / Class) | Tuyên bố README (README claim) | Hiện trạng kiểm chứng mã nguồn (Code verified) | Trạng thái kiểm thử (Tests run) | Quyết định tiếp nhận (Decision) | Cảnh báo & Giới hạn kỹ thuật (Technical Caveat) |
|:---:|---|---|---|---|---|---|---|:---:|:---:|---|
| **01** | **Giỏ hàng & Đơn hàng E-commerce** | `VIVPM/ecommerce-agent` | `main` | `agent/tools.py` | `add_to_cart()`, `place_order()` | Hỗ trợ tìm kiếm, thêm giỏ và chốt đơn hàng qua chatbot tự động. | **VERIFIED_IN_CODE**:<br/>Có logic cập nhật danh sách mặt hàng và tính tổng tiền, nhưng thao tác ghi CSDL trực tiếp không qua transaction. | `NOT_RUN` | **ADAPT** | Lưu trữ SQLite đơn giản; thiếu cơ chế khóa dòng (`FOR UPDATE`) và không có Idempotency Key chống đặt trùng. |
| **02** | **Truy vấn CSDL tự động (Text-to-SQL)** | `VIVPM/ecommerce-agent` | `main` | `agent/sql_agent.py` | `create_sql_agent()`, `run_query()` | AI tự động chuyển câu hỏi tự nhiên thành câu lệnh SQL truy vấn CSDL. | **VERIFIED_IN_CODE**:<br/>Cho phép mô hình thực thi chuỗi SQL tự sinh không kiểm soát vào CSDL. | `NOT_RUN` | **REJECT** | **Nguy cơ SQL Injection cực lớn.** RetailMind AI loại bỏ hoàn toàn Text-to-SQL, thay thế bằng Typed Tool Parameterized Queries. |
| **03** | **Cấu trúc Dịch vụ & RAG FastAPI** | `GrayNguyen-Data/FlowAssist-Chatbot` | `main` | `app/api/v1/endpoints/chat.py` | `ChatService.stream_response()` | Nền tảng chatbot thông minh với FastAPI, Qdrant và cơ chế streaming. | **VERIFIED_IN_CODE**:<br/>Phân tách tầng Router $\rightarrow$ Service $\rightarrow$ Repository rất mạch lạc, xử lý async tốt. | `NOT_RUN` | **ADAPT** | Học hỏi mô hình Router/Service của FastAPI; loại bỏ phần phụ thuộc Redis/MinIO để tối ưu hóa chạy local. |
| **04** | **Trích xuất Yêu cầu Khách hàng** | `tynaai/neoai` | `main` | `src/mastra/agents/shopper.ts` | `extractPreferences()`, `rankItems()` | Tự động bóc tách ngân sách, tiêu chí RAM/CPU từ ngôn ngữ tự nhiên. | **VERIFIED_IN_CODE**:<br/>Sử dụng Zod Schema để ép kiểu đầu ra của LLM sang JSON có cấu trúc. | `NOT_RUN` | **ADAPT** | Dự án viết bằng TypeScript/Mastra; RetailMind AI thích nghi sang Pydantic BaseModel trong Python. |
| **05** | **Hybrid Search (Dense + BM25 RRF)** | `tuanfptu/VietTheory-Agentic-Nexus` | `main` | `src/retrieval/hybrid_search.py` | `reciprocal_rank_fusion()`, `search_hybrid()` | Tìm kiếm kết hợp vector ngữ nghĩa và từ khóa chính xác với thuật toán RRF. | **VERIFIED_IN_CODE**:<br/>Giải thuật RRF tính điểm $RRF(d) = \sum \frac{1}{60 + r_i(d)}$ chuẩn xác, triệt tiêu chênh lệch score. | `NOT_RUN` | **ADAPT (Phase 6)** | Đưa vào lộ trình nâng cao ở Phase 6; Phase 3 chỉ giữ Dense Vector baseline để khóa chặt Design Freeze. |
| **06** | **Tool Registry Định Kiểu Chặt Chẽ** | `quocdungTlu/C2-App-031` | `main` | `backend/app/agents/tools.py` | `BaseTool`, `SearchInputSchema` | Đóng gói công cụ an toàn với Pydantic, validate tham số trước khi thực thi. | **VERIFIED_IN_CODE**:<br/>Có try-catch ngoại lệ, timeout và trace log cho từng lần gọi tool. | `NOT_RUN` | **REUSE & ADAPT** | Áp dụng trực tiếp làm tiêu chuẩn cho toàn bộ 17 Tools nội bộ của RetailMind AI trong Phase 4. |
| **07** | **Đánh Giá Tự Động Tất Định (Eval)** | `quocdungTlu/agent-evaluator` | `main` | `evals/evaluator.py` | `exact_match_score()`, `faithfulness_metric()` | Chấm điểm câu trả lời của mô hình dựa trên quy tắc toán học và ground truth. | **VERIFIED_IN_CODE**:<br/>Có bộ khung test so sánh string, containment, regex và JSON schema match. | `NOT_RUN` | **ADAPT** | Xây dựng bộ test suite chạy offline trong `evals/` của RetailMind AI, tích hợp vào CI/CD pipeline. |
| **08** | **Thiết Kế Qdrant Payload & Filtering** | `ShivamBwaj/Ecommerce-RAG-Chatbot` | `main` | `rag/qdrant_manager.py` | `create_collection()`, `filter_by_metadata()` | Lưu trữ vector sản phẩm kèm thông tin danh mục, giá tiền trong payload. | **VERIFIED_IN_CODE**:<br/>Sử dụng `Filter(must=[FieldCondition(...)])` tối ưu hóa tốc độ tìm kiếm. | `NOT_RUN` | **ADAPT** | RetailMind AI chỉ dùng Qdrant cho chính sách bảo hành (`policies`), KHÔNG lưu giá và tồn kho authoritative vào vector DB. |
| **09** | **Quy Trình Sinh & Xử Lý Ticket** | `LikhithV02/Customer-Support-Agent` | `main` | `agents/support_agent.py` | `create_ticket()`, `escalate_issue()` | Tự động phát hiện bất mãn của khách hàng để tạo ticket hỗ trợ. | **VERIFIED_IN_CODE**:<br/>Có luồng phân loại `URGENT / NORMAL` dựa trên cảm xúc người dùng. | `NOT_RUN` | **ADAPT** | Tích hợp thành UC10 của RetailMind AI; ticket bắt buộc phải liên kết với khóa ngoại `orders.id` trong CSDL. |
| **10** | **Cơ Chế Phê Duyệt Hành Động (HITL)** | `Thebeardedambivert/shopify-ai-ops-agent` | `main` | `src/mcp_server.py` | `require_approval()`, `execute_mutation()` | Tạm dừng tiến trình và yêu cầu con người xác nhận trước khi sửa đổi dữ liệu. | **VERIFIED_IN_CODE**:<br/>Sử dụng decorator chặn các hàm mutation, lưu trạng thái pending vào hàng đợi. | `NOT_RUN` | **ADAPT** | Ứng dụng vào luồng Order Confirmation (UC08): LLM chỉ sinh Preview Token, người dùng bắt buộc nhấn nút chốt đơn. |
| **11** | **Cấp Quyền Shell / Docker cho Agent** | `NeoCyber05/Docker-Agent-CLI` | `main` | `docker_agent/cli.py` | `execute_container_command()` | Cho phép AI Agent tự động gõ lệnh Shell và điều khiển Docker Engine. | **VERIFIED_IN_CODE**:<br/>Gắn trực tiếp Docker Unix Socket vào ngữ cảnh suy luận của LLM. | `NOT_RUN` | **REJECT** | **Lỗ hổng bảo mật cấp độ thảm họa (RCE).** Cấm tuyệt đối không cấp quyền shell hoặc Docker cho Customer Shopping Agent. |
| **12** | **Phân Quyền Truy Cập Tài Liệu RAG** | `onyx-dot-app/onyx` | `main` | `backend/onyx/access/models.py` | `DocumentAccessCheck`, `filter_by_user()` | Kiểm tra quyền truy cập tài liệu trước khi trả về kết quả vector search. | **VERIFIED_IN_CODE**:<br/>Có trường `access_type` (`public`, `internal`, `confidential`) lọc trước khi embed. | `NOT_RUN` | **ADAPT** | Ứng dụng trường `visibility` (`public`, `admin_only`) trong bảng `policies` và Payload của Qdrant. |
| **13** | **Vòng Đời Xử Lý Tài Liệu (Ingestion)** | `infiniflow/ragflow` | `main` | `rag/nlp/chunker.py` | `hierarchical_chunk()`, `clean_text()` | Tách đoạn văn bản thông minh theo tiêu đề, cấu trúc bảng biểu và mục lục. | **VERIFIED_IN_CODE**:<br/>Kỹ thuật phân mảnh giữ nguyên tiêu đề cha giúp tăng độ chính xác trích dẫn. | `NOT_RUN` | **ADAPT** | Áp dụng cho tài liệu chính sách bảo hành của RetailMind AI, lưu giữ thông tin `section` trong metadata. |
| **14** | **Chuẩn Hóa Function Calling** | `openai/openai-agents-python` | `main` | `agents/tool.py` | `FunctionTool` | Khung chuẩn định nghĩa tool calling chính thức của OpenAI. | **VERIFIED_IN_CODE**:<br/>Cấu trúc JSON Schema chuẩn hóa cho input/output của tool. | `NOT_RUN` | **REUSE** | Đảm bảo các tool nội bộ của RetailMind AI tương thích hoàn hảo với mọi model hỗ trợ Function Calling. |
| **15** | **Giao Thức Model Context Protocol** | `modelcontextprotocol/servers` | `main` | `src/server.py` | `Server`, `Resource`, `Tool` | Chuẩn giao thức mở của Anthropic kết nối an toàn giữa AI và dữ liệu. | **VERIFIED_IN_CODE**:<br/>Phân tách rõ ràng giữa `Resources` (Read-only) và `Tools` (Actions). | `NOT_RUN` | **ADAPT (Phase 8)** | Chỉ kích hoạt giao diện MCP Server Read-only ở Phase 8 phục vụ mở rộng; không làm phức tạp hóa MVP ban đầu. |
| **16** | **Lọc Vector Kết Hợp HNSW Index** | `qdrant/examples` | `master` | `qdrant_client/models.py` | `VectorParams`, `Distance.COSINE` | Hướng dẫn chính thức cấu hình bộ nhớ vector Qdrant hiệu năng cao. | **VERIFIED_IN_CODE**:<br/>Cấu hình Cosine Distance và payload schema index tối ưu. | `NOT_RUN` | **REUSE** | Áp dụng cấu hình chuẩn `dim=1536` (hoặc `dim=384` với local embedding), `Distance.COSINE` cho collection `policy_chunks`. |

---

## 3. Tổng Kết & Bài Học Đúc Rút Cho Giai Đoạn Thiết Kế (Key Insights)

1. **Bài học về Tính Chân Lý Dữ Liệu (Source of Truth):**
   - Nhiều repo thương mại điện tử nghiệp dư mắc sai lầm nghiêm trọng khi lưu giá sản phẩm và tồn kho vào Vector DB hoặc phó mặc cho LLM ghi nhớ.
   - RetailMind AI kiên định nguyên tắc: **PostgreSQL là nguồn chân lý duy nhất cho giao dịch và tồn kho; Qdrant chỉ là chỉ mục tìm kiếm thứ cấp.**
2. **Bài học về Phòng Thủ Chiều Sâu (Defense in Depth):**
   - Loại bỏ hoàn toàn 2 mẫu phản thiết kế nguy hiểm nhất: `Unrestricted Text-to-SQL` (từ `ecommerce-agent`) và `Shell/Docker execution` (từ `Docker-Agent-CLI`).
   - Mọi thao tác ghi dữ liệu của người dùng bắt buộc phải đi qua API Service chuẩn, có Token xác thực, kiểm tra quyền sở hữu và cơ chế Idempotency.
