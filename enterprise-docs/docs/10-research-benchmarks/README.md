# 🔬 Nhóm 10 — Khảo Sát Kỹ Thuật & Ma Trận Bằng Chứng Thực Nghiệm (Research & Benchmarks)

**Dự án:** RetailMind AI — Production-Oriented Agentic Retail Intelligence Platform  
**Vị trí:** `enterprise-docs/docs/10-research-benchmarks/`  
**Mục đích:** Cung cấp minh chứng thực nghiệm và cơ sở khoa học đắt giá nhất cho mọi quyết định công nghệ trong dự án. Khi nhà tuyển dụng hoặc hội đồng kỹ thuật hỏi: *"Tại sao em chọn mô hình này mà không chọn mô hình kia?"*, các bằng chứng trong phân khu này là câu trả lời có tính thuyết phục tuyệt đối.

---

## 📑 Danh Mục Tài Liệu Khảo Sát & Bằng Chứng

| Mã Tài Liệu | Tên Tài Liệu | Trọng Tâm Khảo Sát | Giá Trị Thực Chiến Khi Phỏng Vấn / Bảo Vệ |
| :---: | :--- | :--- | :--- |
| **01** | [01-EVIDENCE_MATRIX.md](01-EVIDENCE_MATRIX.md) | **Master Evidence Matrix 16 Kho Mã Nguồn Mở** | Đối chiếu chi tiết 16 repo (VIVPM, FlowAssist, VietTheory, Mastra, Onyx, Ragflow...), chỉ rõ file, hàm, tuyên bố README vs code thực tế, và quyết định tiếp nhận (`REUSE`, `ADAPT`, `REIMPLEMENT`, `REJECT`). |
| **02** | [02-COMMERCE_FLOW.md](02-COMMERCE_FLOW.md) | **Phân Tích Luồng Thương Mại E-Commerce** | Khảo sát các bẫy chết người của shopping bot: Đặt hàng ảo, rớt transaction, race condition, và thiết kế luồng Preview Token 10 phút. |
| **03** | [03-INVENTORY_FLOW.md](03-INVENTORY_FLOW.md) | **Phân Tích Luồng Quản Lý Tồn Kho** | So sánh các mô hình trừ tồn kho trong thương mại điện tử; lý do bắt buộc dùng PostgreSQL `SELECT ... FOR UPDATE` thay vì Redis hoặc LLM state. |
| **04** | [04-RAG_FLOW.md](04-RAG_FLOW.md) | **Phân Tích Kiến Trúc RAG & Ingestion** | Khảo sát cơ chế Chunking, Deduplication, Băm SHA-256 chống trùng lặp, Vector Indexing với Qdrant Cosine Distance. |
| **05** | [05-AGENT_TOOL_FLOW.md](05-AGENT_TOOL_FLOW.md) | **Phân Tích Luồng Điều Phối Công Cụ Tác Tử** | Bẫy "Agentic Trap": Lý do cấm hoàn toàn Text-to-SQL tự do; thiết kế LangGraph StateGraph hữu hạn có trần `MAX_STEPS = 5`. |
| **06** | [06-SECURITY_RELIABILITY.md](06-SECURITY_RELIABILITY.md) | **An Toàn Thông Tin & Độ Tin Cậy** | Khảo sát các lỗ hổng OWASP LLM Top 10, tấn công Zero-width, cơ chế khử khuẩn PII tiếng Việt theo Nghị định 13/2023/NĐ-CP. |
| **07** | [07-EVALUATION_BENCHMARK.md](07-EVALUATION_BENCHMARK.md) | **Chiến Lược Đánh Giá Tự Động (Eval Suite)** | Thiết kế bộ đánh giá tất định (Deterministic Evaluation) không phụ thuộc LLM-as-a-judge đắt đỏ: ROUGE, Exact Match, Schema Validation. |
| **08** | [08-INTEGRATION_DECISIONS.md](08-INTEGRATION_DECISIONS.md) | **Quyết Định Tích Hợp Hệ Thống** | Bảng lý do chọn/bỏ các giải pháp bên thứ 3 (PostgreSQL vs SQLite, Qdrant vs Pgvector, Internal Tools vs MCP, Local vs Cloud). |
| **09** | [09-REJECTED_PATTERNS.md](09-REJECTED_PATTERNS.md) | **Danh Mục Mẫu Phản Thiết Kế Bị Bác Bỏ** | 10 Anti-Patterns kinh điển bị cấm tiệt (Text-to-SQL, Shell Execution, Float Currency, In-Memory Inventory, Infinite Agent Loops...). |

---

## 🎯 Ứng Dụng Trong Tuyển Dụng & Đào Tạo

> [!TIP]
> **Vũ Khí Phản Biện Cho Kỹ Sư Senior AI:**
> Bất cứ khi nào gặp câu hỏi so sánh kiến trúc (ví dụ: *"Tại sao không cho Agent sinh SQL trực tiếp cho nhanh?"* hay *"Tại sao không lưu giá vào Qdrant Payload cho tiện?"*), hãy trích dẫn trực tiếp bảng kiểm chứng từ [01-EVIDENCE_MATRIX.md](01-EVIDENCE_MATRIX.md) và [09-REJECTED_PATTERNS.md](09-REJECTED_PATTERNS.md).
