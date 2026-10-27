# Danh Mục & Hồ Sơ Các Kho Mã Nguồn Tham Khảo (Reference Source Inventory)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Tài liệu:** `docs/research/inventory.md`  
**Căn cứ đặc tả:** `prompt_sections/01_PRODUCT_AND_REFERENCES.md` (Mục 3)  
**Giai đoạn:** Phase 0 (Research & Feasibility Audit)  
**Trạng thái:** COMPLETED FOR PHASE 0 BASELINE  

---

## 1. Tôn Chỉ Khảo Sát Mã Nguồn (Research Protocol)

1. **Khảo sát có chủ đích (Targeted Inspection):** Khảo sát mã nguồn mở để học hỏi các mẫu thiết kế (design patterns), thực tiễn công nghệ và phát hiện các bẫy lỗi (pitfalls).
2. **Tuyệt đối không sao chép nguyên khối (No Blind Copy-Paste):** RetailMind AI là một kiến trúc thống nhất (Modular Monolith), không lắp ghép chắp vá các service độc lập từ bên ngoài.
3. **Phân loại trạng thái minh bạch:**
   - `RUN_VERIFIED`: Đã chạy thử nghiệm và kiểm chứng chức năng thực tế.
   - `VERIFIED_IN_CODE`: Đã đọc chi tiết từng file, class, hàm và luồng xử lý trong mã nguồn.
   - `README_CLAIM_ONLY`: Tính năng chỉ mới được quảng bá trên tài liệu README, chưa được kiểm chứng trong code.
   - `REJECTED`: Mẫu thiết kế không đạt chuẩn hoặc gây mất an toàn, đã bị loại bỏ chính thức.

---

## 2. Bảng Danh Mục Chi Tiết 16 Nguồn Tham Khảo (Master Inventory)

### Nhóm A: Các Kho Mã Nguồn Cốt Lõi (Core References)

| STT | Kho lưu trữ (Repository) | Giấy phép (License) | Công nghệ chính | Trọng tâm khảo sát cho RetailMind AI | Cảnh báo & Rủi ro phát hiện |
|:---:|---|:---:|---|---|---|
| **01** | [VIVPM/ecommerce-agent](https://github.com/VIVPM/ecommerce-agent) | MIT | Python, LangChain, SQLite, Streamlit | • Luồng E-commerce khép kín: Giỏ hàng, xem trước đơn hàng, đặt hàng giả lập.<br/>• Server-Sent Events (SSE) streaming token và sự kiện. | ⚠️ **Cảnh báo nghiêm trọng:** Dự án sử dụng Unrestricted Text-to-SQL (để LLM tự sinh câu truy vấn SQL thô). RetailMind AI **BÁC BỎ HOÀN TOÀN** mẫu này vì nguy cơ SQL Injection. |
| **02** | [GrayNguyen-Data/FlowAssist-Chatbot](https://github.com/GrayNguyen-Data/FlowAssist-Chatbot) | Apache-2.0 | FastAPI, LangChain, Qdrant, Docker | • Cấu trúc dịch vụ FastAPI sạch sẽ.<br/>• Tiến trình tiếp nhận và phân mảnh tài liệu RAG.<br/>• Giao thức kết nối MCP (Model Context Protocol). | ⚠️ Tránh ôm đồm thêm quá nhiều dependency bên ngoài (Redis, MinIO) khi chưa thực sự cần thiết trong giai đoạn MVP. |
| **03** | [tynaai/neoai](https://github.com/tynaai/neoai)<br/>*(Fork: Aohkne/NeoAI)* | MIT | TypeScript, Mastra, Next.js, TailwindCSS | • Kỹ thuật trích xuất yêu cầu khách hàng qua hội thoại tự nhiên.<br/>• Thuật toán xếp hạng sản phẩm (Product Ranking).<br/>• Giao diện so sánh sản phẩm trực quan. | ⚠️ Dự án viết bằng TypeScript/Mastra; RetailMind AI dùng backend Python/FastAPI nên chỉ học hỏi logic tư duy và pattern UI, không copy code. |
| **04** | [tuanfptu/VietTheory-Agentic-Nexus](https://github.com/tuanfptu/VietTheory-Agentic-Nexus) | MIT | Python, Qdrant, BM25, Cross-Encoder | • Tìm kiếm lai Hybrid Search kết hợp Dense Vector và BM25 Sparse.<br/>• Thuật toán Reciprocal Rank Fusion (RRF).<br/>• Kiểm chứng trích dẫn căn cứ trước khi trả lời. | ⚠️ Kiến trúc Hybrid nâng cao chỉ đưa vào từ **Phase 6**; Phase 3 chỉ triển khai Dense Vector baseline đơn giản để kiểm soát độ phức tạp. |
| **05** | [quocdungTlu/C2-App-031](https://github.com/quocdungTlu/C2-App-031) | MIT | Python, LangGraph, Pydantic, FastAPI | • Quản lý danh mục công cụ (Tool Registry) với Pydantic typed schema.<br/>• Ranh giới bảo vệ Guardrails ngăn chặn đầu vào độc hại.<br/>• Đo lường chi phí token và độ trễ. | ⚠️ Dự án gốc xử lý domain đặt vé du lịch; RetailMind AI chỉ học hỏi khung điều phối Pydantic/LangGraph, giữ vững domain thương mại điện tử. |
| **06** | [quocdungTlu/agent-evaluator](https://github.com/quocdungTlu/agent-evaluator) | MIT | Python, Pytest, Pandas | • Khung đánh giá tự động dựa trên quy tắc tất định (Deterministic grading).<br/>• Kỹ thuật LLM-as-a-Judge đánh giá độ trung thực (Faithfulness). | ⚠️ Tuyệt đối không khai báo số liệu đánh giá giả định khi chưa chạy test thực tế trên Golden Dataset. |
| **07** | [ShivamBwaj/Ecommerce-RAG-Chatbot](https://github.com/ShivamBwaj/Ecommerce-RAG-Chatbot) | Apache-2.0 | Python, Qdrant, Streamlit | • Thiết kế Payload cho Vector trong Qdrant.<br/>• Cơ chế lọc Metadata (`category`, `price_range`, `availability`) trước khi tìm kiếm vector. | ⚠️ Cần kiểm tra kỹ mã nguồn thực tế, tránh các repo chỉ có file README mà thiếu code logic xử lý. |
| **08** | [LikhithV02/Customer-Support-Agent](https://github.com/LikhithV02/Customer-Support-Agent) | MIT | Python, LangGraph, SQLite | • Quy trình xử lý khiếu nại và sinh Ticket hỗ trợ.<br/>• Phân loại mức độ ưu tiên của Ticket (Priority Triage). | ⚠️ Ticket phải gắn chặt với thực thể đơn hàng trong CSDL PostgreSQL, không lưu phân mảnh rời rạc. |
| **09** | [Thebeardedambivert/shopify-ai-ops-agent](https://github.com/Thebeardedambivert/shopify-ai-ops-agent) | MIT | Python, MCP, FastMCP | • Cơ chế Human-in-the-Loop (HITL) phê duyệt thao tác nhạy cảm.<br/>• Giao diện đóng gói công cụ MCP chuẩn Anthropic. | ⚠️ Không kéo các tính năng quản trị phức tạp của Shopify vào; MCP chỉ phục vụ chế độ Read-Only ở Phase 8. |
| **10** | [NeoCyber05/Docker-Agent-CLI](https://github.com/NeoCyber05/Docker-Agent-CLI) | MIT | Python, Docker SDK, Click | • Cơ chế phê duyệt hành động hệ thống qua Console CLI.<br/>• Hộp cát (Sandbox) cô lập môi trường thực thi. | ⚠️ **Cảnh báo bảo mật tối cao:** Tuyệt đối KHÔNG cấp quyền thực thi lệnh Shell hoặc Docker Socket cho AI Agent của khách hàng. |

---

### Nhóm B: Các Nền Tảng Cấp Doanh Nghiệp (Enterprise Reference Systems)

| STT | Nền tảng (Platform) | Giấy phép | Trọng tâm học hỏi kiến trúc |
|:---:|---|:---:|---|
| **11** | [onyx-dot-app/onyx](https://github.com/onyx-dot-app/onyx)<br/>*(Tiền thân: Danswer)* | MIT | • Hệ thống phân quyền truy cập tài liệu RAG đa tầng (Document-Level ACL).<br/>• Quản lý nguồn dữ liệu và cơ chế vô hiệu hóa vector lỗi thời. |
| **12** | [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | Apache-2.0 | • Chu trình Ingestion toàn diện: Validate MIME $\rightarrow$ Parse $\rightarrow$ Chunk $\rightarrow$ Index $\rightarrow$ Versioning.<br/>• Xử lý tài liệu có cấu trúc bảng biểu và danh mục điều khoản. |
| **13** | [langgenius/dify](https://github.com/langgenius/dify) | Apache-2.0 | • Trừu tượng hóa nhà cung cấp mô hình (Model Provider Abstraction).<br/>• Hệ thống sổ cái ghi vết (Trace Ledger) và đo lường tài nguyên. |

---

### Nhóm C: Bộ SDK & Chuẩn Công Nghệ Chính Thức (Official Standards)

| STT | Kho lưu trữ / Tài liệu | Mục đích chuẩn hóa |
|:---:|---|---|
| **14** | [openai/openai-agents-python](https://github.com/openai/openai-agents-python) | Chuẩn hóa cấu trúc Tool Definition và Function Calling. |
| **15** | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Đặc tả giao thức MCP (Model Context Protocol) cho các công cụ đọc dữ liệu an toàn. |
| **16** | [qdrant/examples](https://github.com/qdrant/examples) & [Qdrant Docs](https://qdrant.tech/documentation/) | Chuẩn thiết kế Collection, HNSW Index, Filterable Payload và Hybrid Query. |

---

## 3. Kết Luận Khảo Sát & Ứng Dụng Trong Phase 0

1. **Khẳng định tính khả thi:** Tất cả các khối chức năng đề ra trong RetailMind AI (FastAPI, PostgreSQL, Qdrant, LangGraph, Pydantic, Docker) đều có tiền lệ thực thi thành công trong các dự án nguồn mở uy tín.
2. **Khắc phục lỗi bảo mật kinh điển:** Nhận diện và ngăn chặn sớm các lỗ hổng nguy hiểm (Text-to-SQL, cấp quyền Shell cho Agent, thiếu kiểm soát đồng thời CSDL).
3. **Hình thành bộ quyết định kiến trúc (ADR):** Dữ liệu từ tài liệu này là cơ sở vững chắc để xây dựng ma trận bằng chứng (`evidence-matrix.md`) và các quyết định tích hợp (`integration-decisions.md`).
