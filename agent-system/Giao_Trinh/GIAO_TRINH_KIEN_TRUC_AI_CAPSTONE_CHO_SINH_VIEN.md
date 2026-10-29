# GIÁO TRÌNH & SỔ TAY THỰC CHIẾN: XÂY DỰNG HỆ THỐNG ENTERPRISE AI PLATFORM
## Tài Liệu Học Tập & Hướng Dẫn Làm Đồ Án Tốt Nghiệp Khóa AI Engineer — VinAI / VinUni
**Tác giả:** Đội ngũ Kiến trúc sư Hệ thống AI (Senior AI Systems Architects)  
**Đối tượng:** Sinh viên, Học viên làm Khóa luận Tốt nghiệp (Capstone Project)  
**Phiên bản:** 2026 Enterprise Production Edition  

---

# LỜI NÓI ĐẦU: TỪ "NGƯỜI GỌI API" ĐẾN "KỸ SƯ HỆ THỐNG AI"

Chào các bạn sinh viên và kỹ sư AI tương lai!

Khi bắt đầu làm đồ án về Trí tuệ Nhân tạo (AI Capstone), 90% sinh viên thường rơi vào chiếc bẫy mang tên **"Demo Maker"**:
* Bạn tạo một giao diện Web đơn giản.
* Người dùng gõ câu hỏi, Backend lấy chuỗi prompt ghép lại rồi gửi lên OpenAI API hoặc Google Gemini API.
* Mô hình trả về kết quả và hiển thị lên màn hình.

Mô hình trên chỉ mất 1 buổi tối để làm xong. Nhưng nếu bạn mang sản phẩm đó ra bảo vệ trước Hội đồng Khoa học hoặc các chuyên gia công nghệ VinAI, bạn sẽ ngay lập tức đối mặt với những câu hỏi thực tế:
1. *"Nếu người dùng nhập câu hỏi tương tự 10.000 lần, hệ thống có gọi API 10.000 lần và tiêu hết hàng ngàn USD không?"*
2. *"Nếu mạng quốc tế đứt cáp hoặc Google API trả về mã lỗi 429 / 503 trong lúc đang bảo vệ, hệ thống của bạn có sập trắng màn hình không?"*
3. *"Làm sao bạn chứng minh mô hình không bịa đặt kiến thức (Hallucination) khi sinh đề thi cho học sinh?"*
4. *"Nếu kẻ xấu chèn ký tự vô hình vào đề bài để bẻ khóa AI (Prompt Injection), hệ thống phòng thủ ra sao?"*

Giáo trình này được biên soạn để giúp bạn nâng tầm từ một **người viết code gọi API đơn thuần** trở thành một **Kỹ sư Hệ thống AI (AI Systems Engineer)** thực thụ. Toàn bộ kiến thức được đúc kết từ 55+ bài Lab thực chiến, 4 Track chuyên sâu (Product, Data Infra/LLMOps, Agentic AI, Shared Arena) và nền tảng giáo dục thích ứng VNLearn.

---

# MỤC LỤC

* **CHƯƠNG 1:** Tư Duy Kỹ Sư Hệ Thống AI & Mô Hình Tinh Thần (Mental Models)
* **CHƯƠNG 2:** Ẩn Dụ Đời Thường Của 16 Công Nghệ Tinh Hoa
* **CHƯƠNG 3:** Kiến Trúc 4 Tầng (4-Tier Clean Architecture) & Bản Đồ Monorepo
* **CHƯƠNG 4:** Masterclass 8 Phân Hệ Cốt Lõi (Kèm Mã Nguồn Mẫu Chuẩn Doanh Nghiệp)
  * 4.1. Orchestration & State Machine (LangGraph, Critic Loop, State as DTO)
  * 4.2. Giao Thức Chuẩn Hóa Model Context Protocol (Full-Stack MCP Server & Client)
  * 4.3. Quản Trị Ngữ Cảnh & Tránh Bẫy Nén (Context Budgeting & Sentinel)
  * 4.4. Hệ Thống RAG Đa Tầng (Hybrid BM25 + Dense RRF + GraphRAG)
  * 4.5. Pháo Đài Bảo Mật Đa Tầng (Zero-Width Shield, AST Scanner, NeMo Rails)
  * 4.6. Khả Năng Tự Hồi Phục & On-Device Fallback (Circuit Breaker & Local GGUF)
  * 4.7. Động Cơ Học Tập Thích Ứng Cá Nhân Hóa (Dual Elo Rating Engine)
  * 4.8. Phân Tích Dữ Liệu Siêu Tốc & GPU FinOps (DuckDB & Carbon Metrics)
* **CHƯƠNG 5:** Phương Pháp Đánh Giá Khoa Học (Evaluation & Inter-Annotator Agreement)
* **CHƯƠNG 6:** Bí Kíp Trả Lời 10 Câu Hỏi "Hóc Búa" Của Hội Đồng Chấm KLTN
* **CHƯƠNG 7:** Lộ Trình Triển Khai 4 Tuần & Kịch Bản Demo Live 10 Phút Hoàn Hảo

---

# CHƯƠNG 1. TƯ DUY KỸ SƯ HỆ THỐNG AI & MÔ HÌNH TINH THẦN (MENTAL MODELS)

Để xây dựng một nền tảng AI tầm cỡ Enterprise, bạn phải nắm vững 3 định luật bất biến của kỹ thuật phần mềm ứng dụng AI:

### Định luật 1: LLM là một thành phần bất định (Non-deterministic)
LLM không phải là một hàm toán học thuần túy ($f(x) = y$). Cùng một câu hỏi, nhiệt độ (`temperature > 0`) có thể cho ra hai câu trả lời khác nhau. Do đó:
* **Không bao giờ tin tưởng tuyệt đối vào output của LLM.** Mọi kết quả phải đi qua bộ lọc kiểm chứng (Verification/Guardrails).
* **Những gì tính toán được bằng code tất định (Deterministic code) thì TUYỆT ĐỐI không để LLM làm.** Ví dụ: Cộng trừ điểm Elo, tính tổng tiền, đo thời gian trễ phải viết bằng Python thuần, không được nhờ LLM tính nhẩm.

### Định luật 2: Chi phí và độ trễ tăng theo kích thước ngữ cảnh (Context Penalty)
Ngữ cảnh càng dài, thời gian sinh token đầu tiên (TTFT - Time to First Token) càng lâu và chi phí token càng đắt. Việc "nhồi nhét" toàn bộ tài liệu vào một prompt khổng lồ là cách tiếp cận ngây thơ nhất. Kỹ sư giỏi là người biết chắt lọc thông tin tinh gọn nhất cho mô hình.

### Định luật 3: Luôn chuẩn bị cho tình huống xấu nhất (Graceful Degradation)
Trong môi trường thực tế, API bên ngoài sẽ bị timeout, mạng sẽ chập chờn, quota sẽ cạn kiệt. Một hệ thống AI xuất sắc không phải là hệ thống không bao giờ gặp lỗi, mà là hệ thống **khi gặp lỗi vẫn tự bảo vệ mình và mang lại trải nghiệm chấp nhận được cho người dùng mà không bao giờ bị Crash (Zero-Crash Guarantee)**.

---

# CHƯƠNG 2. ẨN DỤ ĐỜI THƯỜNG CỦA 16 CÔNG NGHỆ TINH HOA

Khi đi bảo vệ đồ án, nếu bạn chỉ đọc các định nghĩa kỹ thuật khô khan, giám khảo sẽ rất nhanh mệt mỏi. Hãy sử dụng những **ẩn dụ đời thường** dưới đây để giải thích kiến trúc một cách trực quan và thuyết phục:

| # | Công nghệ Tinh hoa | Ẩn dụ đời thường dễ nhớ | Bản chất kỹ thuật trong hệ thống |
|---|---|---|---|
| **1** | **Full-Stack MCP** | **Cổng cắm chuẩn USB-C đa năng** | Chuẩn hóa kết nối: Vừa cho phép AI cắm vào tool ngoài (Client), vừa cho phép Claude/Cursor cắm vào Capstone để lấy dữ liệu học tập (Server). |
| **2** | **Context Budget & Sentinel** | **Cân hành lý sân bay & Người gác cổng** | Giới hạn số token nghiêm ngặt, giữ lại 15% quota cho Tool Call và ép mô hình phải chốt câu trả lời cuối cùng trước khi cạn ngân sách. |
| **3** | **Critic / Reflection Loop** | **Biên tập viên tòa soạn** | Tác tử viết bài xong không được phát ngay mà phải chuyển cho Biên tập viên kiểm tra: Nếu bịa đặt số liệu thì bắt quay về sửa lại. |
| **4** | **State as DTO** | **Cuốn sổ khám bệnh đa khoa** | State là "cuốn sổ bệnh án" bất biến: Y tá ghi chỉ số $\rightarrow$ Bác sĩ X-quang kẹp phim $\rightarrow$ Bác sĩ Trưởng khoa đọc toàn bộ để kê đơn. |
| **5** | **Zero-Width Shield** | **Máy soi mực vô hình của cảnh sát** | Bóc tách và tiêu hủy các ký tự tàng hình `[\u200b-\u200f]` mà hacker lén cài vào để vượt mặt các bộ lọc an ninh. |
| **6** | **NeMo Guardrails Colang** | **Kịch bản ứng xử của nhân viên lễ tân** | Quy định cứng các luồng hội thoại: Gặp chủ đề nhạy cảm, chính trị, jailbreak thì từ chối lịch sự theo mẫu có sẵn. |
| **7** | **AST Static Scanner** | **Cửa từ an ninh sân bay** | Quét cấu trúc cú pháp của code trước khi cho chạy, phát hiện và tịch thu ngay các "vũ khí nguy hiểm" như `os.system` hay `eval`. |
| **8** | **Denied Capabilities Policy** | **Bản cam kết không phận sự miễn vào** | Khai báo trong `tool_manifest.yaml` danh sách các quyền bị cấm tuyệt đối: Cấm mở terminal shell, cấm sửa file hệ thống. |
| **9** | **3-Phase Circuit Breaker** | **Cầu dao tự động (Aptomat) trong nhà** | Khi điện chập (API lỗi liên tục), cầu dao nhảy sang `OPEN` để ngắt dòng điện, bảo vệ hệ thống không bị cháy nổ. Sau đó hé mở `HALF-OPEN` để thử lại. |
| **10** | **Local On-Device Engine** | **Máy phát điện dự phòng chạy dầu** | Khi lưới điện quốc gia (Internet/Cloud API) sập hoàn toàn, máy phát điện GGUF cục bộ tự nổ máy để duy trì chức năng cốt lõi. |
| **11** | **Semantic Vector Cache** | **Trí nhớ phản xạ của học sinh giỏi** | Những câu hỏi có cùng ý nghĩa ($\ge 95\%$) không cần suy nghĩ lại, trả lời ngay lập tức trong 5 mili-giây với 0 đồng chi phí. |
| **12** | **SQLite3 AuditStore** | **Hộp đen máy bay** | Ghi lại từng thao tác có tác động thay đổi dữ liệu kèm mã Idempotency Key, đảm bảo không bao giờ thực hiện 1 hành động 2 lần. |
| **13** | **Hybrid RAG + GraphRAG** | **Tra cứu mục lục + Sơ đồ cây gia phả** | Kết hợp tìm kiếm từ khóa chính xác (BM25) và hiểu ngữ cảnh (Dense Vector), đồng thời kết nối các khái niệm thành mạng lưới tri thức. |
| **14** | **In-Process DuckDB** | **Chiếc siêu xe thể thao F1 tí hon** | Động cơ phân tích dữ liệu dạng cột (Columnar) nằm gọn ngay trong bộ nhớ RAM, phân tích triệu dòng log nhanh gấp 50 lần database thông thường. |
| **15** | **Dual Elo Rating Engine** | **Bảng xếp hạng đại kiện tướng cờ vua** | Đánh giá năng lực của học sinh và độ khó của bài tập theo cùng một thang đo điểm, luôn ghép bài tập vừa sức để học sinh tiến bộ. |
| **16** | **Inter-Annotator Agreement** | **Hội đồng chấm thi 3 người độc lập** | Đo lường mức độ đồng thuận giữa 3 giám khảo (người và AI) bằng chỉ số Cohen's Kappa để tạo ra bộ đề thi chuẩn khoa học. |

---

# CHƯƠNG 3. KIẾN TRÚC 4 TẦNG & BẢN ĐỒ MONOREPO

Một kiến trúc tốt phải tách bạch trách nhiệm rõ ràng (Separation of Concerns). Nền tảng của chúng ta tuân thủ chuẩn **4-Tier Clean Architecture**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      TẦNG 1: TRÌNH DIỄN (PRESENTATION)                 │
│  - React 18 SPA (Vite, TailwindCSS, Framer Motion)                     │
│  - Trình đọc tài liệu PDF 2 trang song song (react-pdf)                │
│  - Sơ đồ tư duy trực quan (Mindmap Canvas) & Audio Studio              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Server-Sent Events (SSE)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    TẦNG 2: CỔNG GIAO TIẾP (API GATEWAY)                │
│  - FastAPI Framework (Chạy 100% Bất đồng bộ Asyncio Lifespan)          │
│  - Bộ khử ký tự ẩn Zero-Width Sanitizer & Rate Limiter                 │
│  - Endpoint Streaming SSE & Cổng vận chuyển MCP Transport              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│              TẦNG 3: BỘ ĐIỀU PHỐI TINH HOA (HARNESS CORE)              │
│  ├── 1. Bộ nhớ đệm ngữ nghĩa: Semantic Vector Cache (Cosine >= 0.95)   │
│  ├── 2. Cổng phòng vệ: Input Guards, AST Scanner, NeMo Rails           │
│  ├── 3. Điều phối ngữ cảnh: Context Budgeting (Giữ 15% Reserve)        │
│  ├── 4. Đồ thị tác tử: LangGraph StateGraph & Critic Self-Reflection   │
│  ├── 5. Giao thức công cụ: Full-Stack MCP (Server & Client Adapter)   │
│  ├── 6. Động cơ thích ứng: Thuật toán Dual Elo Rating Vygotsky ZPD     │
│  └── 7. Khả năng tự phục hồi: 3-Phase Circuit Breaker & Fallback Ladder │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────┐ ┌─────────────▼───────────────────┐
│     TẦNG 4A: MÔ HÌNH (MODELS)      │ │   TẦNG 4B: LƯU TRỮ & DỮ LIỆU    │
│  - Cloud LLM (Gemini Pro/Flash)    │ │  - Hybrid Vector DB (ChromaDB)  │
│  - Local Engine (GGUF / llama.cpp) │ │  - Knowledge Graph (GraphRAG)   │
│  - Fast Router & Embedding Model   │ │  - DuckDB Columnar Analytics    │
│                                    │ │  - SQLite3 Idempotent AuditStore│
└────────────────────────────────────┘ └─────────────────────────────────┘
```

### Cấu Trúc Thư Mục Chuẩn Đồ Án (`capstone-ai-platform/`)
Khi bắt tay vào code, bạn sẽ tổ chức dự án theo cây thư mục sau:

```text
capstone-ai-platform/
├── configs/                          # Cấu hình hệ thống & Registry
│   ├── app_config.yaml
│   └── prompts.yaml                  # Prompt Registry quản lý phiên bản
├── contracts/                        # Ràng buộc dữ liệu & Chính sách
│   ├── api_contract.yaml
│   ├── error_policy.md               # Chính sách Fail-Closed & Bỏ phiếu trắng
│   └── tool_manifest.yaml            # Denied Capabilities (Cấm shell, exec)
├── data/                             # Dữ liệu tài liệu & Đề thi
│   ├── raw_documents/
│   └── golden_datasets/
├── src/                              # Mã nguồn lõi (Core Source Code)
│   ├── harness/                      # [TRÁI TIM HỆ THỐNG]
│   │   ├── cache/semantic_cache.py   # Semantic Vector Cache
│   │   ├── context/budget.py         # Quản trị Token Budget & Sentinel
│   │   ├── guards/                   # Hệ thống phòng ngự an ninh
│   │   │   ├── input_guards.py       # Khử ký tự Zero-width
│   │   │   ├── ast_security.py       # Quét cây cú pháp tĩnh Python
│   │   │   └── nemo_rails.co         # Kịch bản an toàn NeMo Colang
│   │   ├── workflow/                 # Đồ thị LangGraph & Tác tử
│   │   │   ├── graph.py
│   │   │   └── critic.py             # Tác tử phản tư kiểm tra ảo giác
│   │   ├── tools/                    # Tool Registry & MCP Client
│   │   │   └── mcp_adapter.py
│   │   └── reliability/              # Cơ chế tự phục hồi
│   │       ├── circuit_breaker.py    # Cầu dao 3 trạng thái
│   │       └── fallback.py           # Thang bậc hạ cấp 4 tầng
│   ├── mcp_server/                   # [CỔNG KẾT NỐI CHUẨN QUỐC TẾ]
│   │   ├── server.py                 # MCP Server mở ra cho Claude/Cursor cắm vào
│   │   ├── resources.py              # Expose bài giảng & tài liệu RAG
│   │   └── tools.py                  # Expose tính năng tính điểm Elo & sinh Quiz
│   ├── adaptive/                     # [SƯ PHẠM HỌC THÍCH ỨNG]
│   │   └── elo.py                    # Thuật toán Dual Elo Rating FIDE
│   ├── data_engine/                  # [PHÂN TÍCH HIỆU NĂNG CAO]
│   │   └── duckdb_store.py           # Phân tích học tập thời gian thực
│   ├── llm/                          # [LỚP SUY LUẬN ĐA TẦNG]
│   │   ├── client.py                 # Gemini / Cloud API
│   │   ├── local_engine.py           # GGUF On-device chạy offline 100%
│   │   └── router.py                 # Điều phối model nặng / nhẹ
│   ├── rag/                          # [HỆ THỐNG TRUY XUẤT TRI THỨC]
│   │   ├── hybrid_retriever.py       # BM25 + Dense RRF Fusion
│   │   ├── reranker.py               # Cross-Encoder Reranker
│   │   └── graph_store.py            # GraphRAG Knowledge Graph
│   ├── api/                          # [CỔNG GIAO TIẾP FASTAPI]
│   │   ├── main.py                   # Async Lifespan Gateway
│   │   └── routes/                   # Chat, Quiz, Decks, MCP, Metrics
│   └── observability/                # [QUAN SÁT HỆ THỐNG & FINOPS]
│       ├── metrics.py                # Prometheus (TTFT, TPOT, Latency)
│       └── finops.py                 # Tính chi phí GPU & Lượng khí thải Carbon
├── tests/chaos/                      # Kịch bản tiêm lỗi (Chaos Engineering)
├── evals/                            # Đánh giá Golden Dataset & Cohen's Kappa
└── frontend/                         # Giao diện React 18 Cyberpunk (VNLearn)
```

---

# CHƯƠNG 4. MASTERCLASS 8 PHÂN HỆ CỐT LÕI (KÈM CODE PATTERNS)

Dưới đây là hướng dẫn chi tiết cách hiểu và hiện thực hóa từng phân hệ công nghệ tinh hoa:

---

### 4.1. Phân hệ 1: Orchestration & State Machine (LangGraph + Critic + State DTO)

#### Vấn đề bài toán:
Nếu bạn để một prompt duy nhất xử lý từ đầu đến cuối, mô hình rất dễ bị "loạn" (Prompt Congestion), tính toán sai số liệu và sinh ảo giác.

#### Giải pháp thiết kế:
1. **State as DTO:** Trạng thái hệ thống là một `TypedDict` có cấu trúc rõ ràng. Mỗi node chỉ đọc dữ liệu cần thiết và trả về phần cập nhật.
2. **Supervisor Pattern:** Tác tử điều phối phân loại ý định người dùng (Hỏi bài, Làm quiz, Xem slide) để định tuyến đến đúng chuyên viên.
3. **Critic / Reflection Loop:** Sau khi Generator sinh câu trả lời, node `Critic` sẽ đối chiếu lại với tài liệu gốc (Grounding Check). Nếu độ tương đồng $< 80\%$, yêu cầu mô hình tự sửa lại (tối đa 2 vòng lặp).

```python
# src/harness/workflow/critic.py
from typing import Dict, Any
from difflib import SequenceMatcher
import unicodedata

def normalize_text(text: str) -> str:
    """Chuẩn hóa Unicode NFKC và loại bỏ khoảng trắng thừa."""
    return " ".join(unicodedata.normalize("NFKC", text).lower().split())

class CriticNode:
    """Tác tử thẩm định: Ngăn chặn ảo giác trước khi gửi về giao diện."""
    def __init__(self, min_grounding_score: float = 0.80):
        self.threshold = min_grounding_score

    def evaluate_grounding(self, response: str, source_context: str) -> Dict[str, Any]:
        norm_resp = normalize_text(response)
        norm_ctx = normalize_text(source_context)
        
        # Đo lường mức độ trùng khớp chuỗi dài nhất
        matcher = SequenceMatcher(None, norm_resp, norm_ctx)
        longest_match = matcher.find_longest_match(0, len(norm_resp), 0, len(norm_ctx))
        grounding_score = longest_match.size / max(len(norm_resp), 1)

        is_valid = grounding_score >= self.threshold
        return {
            "is_grounded": is_valid,
            "score": round(grounding_score, 4),
            "critique": "Hợp lệ" if is_valid else "Phát hiện thông tin chưa được kiểm chứng trong tài liệu!"
        }
```

---

### 4.2. Phân hệ 2: Giao Thức Chuẩn Hóa Model Context Protocol (Full-Stack MCP)

#### Vấn đề bài toán:
Các công cụ AI hiện nay thường bị phân mảnh: Mỗi công ty tự viết một chuẩn plugin riêng, không thể tái sử dụng.

#### Giải pháp thiết kế:
Sử dụng chuẩn **Model Context Protocol (MCP)** do Anthropic khởi xướng (chuẩn công nghiệp 2026):
* **MCP Client (`mcp_adapter.py`):** Giúp Agent kết nối động tới các MCP Server có sẵn bên ngoài (như Filesystem, GitHub, PostgreSQL).
* **Capstone MCP Server (`src/mcp_server/server.py`):** **Biến chính nền tảng đồ án của bạn thành một MCP Server**. Nhờ đó, một lập trình viên dùng **Claude Desktop** hoặc **Cursor IDE** có thể thêm URL hệ thống của bạn vào cấu hình để hỏi bài và làm quiz trực tiếp từ IDE của họ!

```python
# src/mcp_server/server.py
"""
Capstone MCP Server: Expose RAG Knowledge & Student Elo Profile
Giao thức: JSON-RPC 2.0 qua Server-Sent Events (SSE) / stdio
"""
from mcp.server.fastmcp import FastMCP
from src.adaptive.elo import calculate_new_elo

mcp = FastMCP("VinAI-Capstone-Knowledge-Server")

@mcp.resource("rag://slides/{topic}")
def get_slide_content(topic: str) -> str:
    """Cung cấp tài liệu slide học tập chuẩn hóa dưới dạng MCP Resource."""
    return f"Nội dung tóm tắt kiến thức chủ đề: {topic}"

@mcp.tool()
def update_student_rating(student_elo: float, question_difficulty: float, is_correct: bool) -> dict:
    """MCP Tool: Tính toán điểm Elo mới của học sinh sau khi làm bài trắc nghiệm."""
    new_student_elo, new_q_diff = calculate_new_elo(student_elo, question_difficulty, is_correct)
    return {
        "updated_student_elo": new_student_elo,
        "updated_question_difficulty": new_q_diff
    }
```

---

### 4.3. Phân hệ 3: Quản Trị Ngữ Cảnh & Tránh Bẫy Nén (Context Budgeting & Sentinel)

#### Bài học "xương máu" từ Agent Arena Day 16:
Khi hội thoại dài, các lập trình viên mới vào nghề thường dùng một LLM phụ để "tóm tắt lại lịch sử chat". 
**Kết quả thực nghiệm khoa học chứng minh:** Việc tóm tắt ngữ cảnh thô thiển làm mất đi các câu trích dẫn nguyên văn (Verbatim Quotes), khiến điểm Faithfulness/Grounding của hệ thống **sụt giảm thảm hại từ 92.52 điểm xuống còn 45.36 điểm!**

#### Giải pháp chuẩn:
1. **Context Window Token Budget:** Chia ngân sách token cố định (ví dụ: tối đa 4000 tokens).
2. **Tool Call Reserve (15%):** Luôn dự trữ 15% quota cuối cùng (600 tokens) cho bước gọi công cụ dọn dẹp.
3. **Finalize Sentinel:** Khi ngân sách còn $< 20\%$, hệ thống lập tức cưỡng chế kích hoạt cờ `is_final_turn = True`, ép mô hình tổng hợp ngay câu trả lời từ dữ liệu hiện có thay vì tiếp tục phân tích lan man.

```python
# src/harness/context/budget.py
class ContextBudgetManager:
    def __init__(self, max_tokens: int = 4096, reserve_ratio: float = 0.15):
        self.max_tokens = max_tokens
        self.reserve_tokens = int(max_tokens * reserve_ratio)
        self.safe_limit = max_tokens - self.reserve_tokens

    def evaluate_budget(self, current_token_count: int) -> dict:
        is_exhausted = current_token_count >= self.safe_limit
        should_force_finalize = current_token_count >= (self.max_tokens - 200)

        return {
            "current_tokens": current_token_count,
            "tokens_remaining": max(0, self.max_tokens - current_token_count),
            "in_tool_reserve": is_exhausted,
            "force_finalize": should_force_finalize
        }
```

---

### 4.4. Phân hệ 4: Hệ Thống RAG Đa Tầng (Hybrid BM25 + Dense RRF + GraphRAG)

#### Vấn đề bài toán:
* Chỉ dùng Vector Search (Dense): Thường tìm sai các từ viết tắt kỹ thuật, mã đơn hàng, công thức toán học.
* Chỉ dùng Từ khóa (BM25 Sparse): Hoàn toàn "mù" trước các câu hỏi đồng nghĩa nhưng khác chữ.

#### Giải pháp thiết kế:
* **Reciprocal Rank Fusion (RRF):** Kết hợp thứ hạng của cả BM25 và ChromaDB theo công thức:
  $$RRF\_Score(d) = \sum_{m \in \{dense, sparse\}} \frac{1}{k + rank_m(d)} \quad (với\ k = 60)$$
* **Cross-Encoder Reranker:** Lấy Top 20 văn bản sau RRF, đưa qua mô hình Cross-Encoder để chấm điểm cặp `(Query, Passage)` chính xác trước khi chọn ra Top 3 đưa vào LLM.
* **GraphRAG:** Trích xuất các thực thể (Entity) và quan hệ (Relationship) thành đồ thị để trả lời các câu hỏi tổng hợp mang tính vĩ mô (ví dụ: *"Toàn bộ chương trình học này gồm những chủ đề nào liên quan đến nhau?"*).

---

### 4.5. Phân hệ 5: Pháo Đài Bảo Mật Đa Tầng (Defense-in-Depth)

Hệ thống bảo vệ theo 4 bức tường thép:
1. **Lớp 1 — Khử ký tự tàng hình (Zero-Width Sanitizer):**
   Kẻ tấn công chèn `\u200b` (Zero-width space) vào giữa chữ `d-a-n` hoặc `i-g-n-o-r-e` để qua mặt regex. Hàm tiền xử lý sẽ bóc sạch các ký tự này ngay tại Gateway.
   ```python
   # src/harness/guards/input_guards.py
   import re

   ZERO_WIDTH_PATTERN = re.compile(r'[\u200b-\u200f\ufeff]')

   def sanitize_input(user_text: str) -> str:
       """Triệt tiêu hoàn toàn mã độc ký tự ẩn vô hình."""
       return ZERO_WIDTH_PATTERN.sub('', user_text).strip()
   ```
2. **Lớp 2 — Quét cây cú pháp tĩnh (AST Static Scanner):**
   Phân tích cấu trúc cây code Python trước khi chuyển vào Sandbox, chặn đứng các thủ thuật Reflection (`__class__.__base__.__subclasses__`).
3. **Lớp 3 — NeMo Guardrails (`nemo_rails.co`):**
   Định nghĩa quy tắc hội thoại cứng chặn đứng jailbreak, off-topic, đòi hỏi thông tin cá nhân (PII).
4. **Lớp 4 — MCP Denied Capabilities Policy (`tool_manifest.yaml`):**
   Cấm tiệt quyền thực thi lệnh shell, ghi đè file hệ thống hoặc đọc secret keys.

---

### 4.6. Phân hệ 6: Khả Năng Tự Phục Hồi & On-Device Fallback (Circuit Breaker)

#### Vấn đề bài toán:
Nếu Google Gemini API bị chập chờn trong lúc bạn đang demo cho Hội đồng chấm điểm, toàn bộ công sức sẽ "đổ sông đổ biển" nếu màn hình hiện lỗi 500.

#### Giải pháp thiết kế:
* **Circuit Breaker 3 trạng thái:**
  * `CLOSED` (Bình thường): Mọi request đi thẳng lên Cloud LLM.
  * `OPEN` (Đứt mạch): Nếu gặp 3 lỗi liên tiếp trong 60 giây, cầu dao nhảy sang `OPEN`. TẤT CẢ các request tiếp theo lập tức chuyển hướng sang **Thang bậc hạ cấp (Fallback Ladder)** mà không gửi lên Cloud nữa (tránh treo hệ thống).
  * `HALF-OPEN` (Thử nghiệm): Sau thời gian làm nguội (Cool-down 30s), cho phép 1 request đi thử. Nếu thành công thì đóng mạch lại (`CLOSED`), nếu thất bại thì tiếp tục ngắt mạch (`OPEN`).
* **On-Device Quantized Engine (Local GGUF Fallback):**
  Tích hợp mô hình nhỏ lượng tử hóa 4-bit (ví dụ: Qwen2.5-1.5B GGUF chạy qua `llama-cpp-python`). Khi mất toàn bộ Internet, hệ thống tự động fallback sang mô hình trên máy cục bộ để tiếp tục trả lời câu hỏi!

```python
# src/harness/reliability/circuit_breaker.py
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, recovery_time: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0

    def can_execute(self) -> bool:
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time >= self.recovery_time:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True # HALF_OPEN

    def record_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
```

---

### 4.7. Phân hệ 7: Động Cơ Học Tập Thích Ứng Cá Nhân Hóa (Dual Elo Rating Engine)

Hệ thống giáo dục thông minh VNLearn áp dụng lý thuyết **Vùng phát triển gần nhất (Zone of Proximal Development - ZPD)** của nhà tâm lý học Lev Vygotsky thông qua mô hình toán học **Dual Elo Rating** (chuẩn FIDE):

* Học sinh có điểm trình độ $R_s$ (Khởi tạo: 1200).
* Mỗi câu hỏi trắc nghiệm có độ khó $R_q$ (Khởi tạo: 1200).
* Xác suất kỳ vọng học sinh trả lời đúng câu hỏi:
  $$E_s = \frac{1}{1 + 10^{(R_q - R_s) / 400}}$$
* Sau khi học sinh trả lời ($S = 1$ nếu đúng, $S = 0$ nếu sai), cập nhật đồng thời cả hai:
  $$R_s^{new} = R_s + K_s \cdot (S - E_s)$$
  $$R_q^{new} = R_q + K_q \cdot ((1 - S) - (1 - E_s))$$
  *(Nếu học sinh giỏi làm sai một câu dễ $\rightarrow$ Độ khó của câu hỏi tự động được tăng lên vì câu đó có tính chất "lừa" cao).*

Thuật toán này đảm bảo hệ thống luôn tự động chọn những câu hỏi có độ khó xấp xỉ trình độ của học sinh ($|R_s - R_q| \le 100$), giúp học sinh không bị nhàm chán (vì bài quá dễ) cũng không bị nản lòng (vì bài quá khó).

---

### 4.8. Phân hệ 8: Phân Tích Dữ Liệu Hiệu Năng Cao & GPU FinOps (DuckDB & Carbon)

1. **DuckDB In-Process Analytical Engine:**
   Thay vì dựng cụm cơ sở dữ liệu ClickHouse hay Apache Spark cồng kềnh, hệ thống sử dụng thư viện DuckDB chạy trực tiếp trong tiến trình backend Python. Bạn có thể thực thi các câu lệnh SQL phân tích phức tạp trên file Parquet/JSONL với tốc độ hàng triệu dòng/giây:
   ```python
   # src/data_engine/duckdb_store.py
   import duckdb

   def get_daily_token_usage_stats(logs_path: str):
       con = duckdb.connect()
       query = f"""
           SELECT 
               date_trunc('day', timestamp) AS day,
               model_name,
               count(*) AS total_requests,
               avg(latency_ms) AS avg_latency,
               sum(total_tokens) AS total_tokens,
               sum(estimated_cost_usd) AS total_cost
           FROM read_json_auto('{logs_path}')
           GROUP BY 1, 2
           ORDER BY 1 DESC
       """
       return con.execute(query).df()
   ```
2. **GPU FinOps & Dấu chân Carbon ($kg\text{ }CO_2e$):**
   Tính toán chi phí suy luận thực tế trên mỗi người dùng và chỉ số phát thải nhà kính dựa trên công suất tiêu thụ điện năng của GPU ($TDP_{GPU}$ tính bằng Watts):
   $$\text{Emissions } (kg\text{ }CO_2e) = \frac{\text{Power (Watts)} \times \text{Hours}}{1000} \times \text{PUE} \times \text{Carbon Intensity Factor}$$
   Đây là điểm cộng cực kỳ lớn về tiêu chuẩn phát triển bền vững (ESG) trước các hội đồng giám khảo quốc tế.

---

# CHƯƠNG 5. PHƯƠNG PHÁP ĐÁNH GIÁ KHOA HỌC (EVALUATION & AGREEMENT)

Một lỗi rất phổ biến của sinh viên là tự tay nhập 5-10 câu hỏi để test rồi kết luận: *"Hệ thống hoạt động chính xác 100%"*. Trong nghiên cứu khoa học, điều này hoàn toàn vô giá trị.

Bạn phải xây dựng một quy trình đánh giá chuẩn mực:
1. **Bộ Dữ Liệu Vàng (Golden Dataset):** Gồm tối thiểu 50-100 kịch bản câu hỏi phân tầng (Dễ, Trung bình, Khó, Bẫy, Đối nghịch).
2. **Đo độ đồng thuận của con người (Inter-Annotator Agreement - IAA):**
   Trước khi dùng làm nhãn chuẩn, ít nhất 2 chuyên viên phải cùng gán nhãn độc lập. Tính hệ số **Cohen's Kappa ($\kappa$)**:
   $$\kappa = \frac{p_o - p_e}{1 - p_e}$$
   Chỉ khi $\kappa \ge 0.75$ thì bộ nhãn vàng mới được công nhận là đạt chuẩn khoa học.
3. **LLM-as-a-Judge với Rubric Chi Tiết:**
   Sử dụng mô hình lớn (như GPT-4o hoặc Gemini 1.5 Pro) để chấm điểm câu trả lời của mô hình nhỏ theo các tiêu chí chuẩn Ragas:
   * **Faithfulness (Độ trung thực):** Có bịa đặt thông tin ngoài tài liệu không?
   * **Answer Relevance (Độ liên quan):** Có trả lời đúng trọng tâm câu hỏi không?
   * **Context Precision (Độ chính xác truy xuất):** Các đoạn văn bản RAG tìm về có đúng đoạn chứa câu trả lời không?

---

# CHƯƠNG 6. BÍ KÍP TRẢ LỜI 10 CÂU HỎI "HÓC BÚA" CỦA HỘI ĐỒNG BẢO VỆ

Hãy chuẩn bị kỹ 10 câu hỏi này, bạn sẽ nắm chắc điểm A+ trong tay:

1. **Hội đồng hỏi:** *"Tại sao em không dùng luôn OpenAI Assistant API cho nhanh mà phải tự dựng Harness, Circuit Breaker, LangGraph làm gì cho phức tạp?"*  
   **Bạn trả lời:** *"Dạ, Assistant API là một hộp đen phụ thuộc hoàn toàn vào một nhà cung cấp (Vendor Lock-in). Trong môi trường doanh nghiệp và đồ án này, chúng em xây dựng một **Enterprise Architecture độc lập**: tự kiểm soát được chi phí (qua Semantic Cache), tự phòng ngự an ninh (Zero-width & AST Scanner), và có cơ chế Fallback sang mô hình Local khi mất mạng. Điều này đảm bảo tính sẵn sàng cao và an toàn dữ liệu nội bộ."*

2. **Hội đồng hỏi:** *"Semantic Vector Cache hoạt động thế nào? Nếu người dùng hỏi câu hỏi khác chữ nhưng cùng ý nghĩa thì sao?"*  
   **Bạn trả lời:** *"Dạ, hệ thống không so khớp chuỗi ký tự bằng hash thô mà chuyển câu hỏi thành vector embedding rồi đo khoảng cách Cosine Similarity. Nếu độ tương đồng $\ge 0.95$, hệ thống trả kết quả từ cache ngay trong 5ms mà không cần gọi LLM, giúp tiết kiệm hơn 50% chi phí token."*

3. **Hội đồng hỏi:** *"Tại sao trong đồ án lại dùng Dual Elo Rating mà không dùng điểm số phần trăm thông thường?"*  
   **Bạn trả lời:** *"Dạ, điểm số phần trăm thông thường không phản ánh được độ khó của đề thi (làm đúng 1 câu cực khó giá trị hơn làm đúng 1 câu quá dễ). Thuật toán Dual Elo đánh giá đồng thời cả năng lực học sinh và độ khó câu hỏi, từ đó hệ thống luôn gợi ý bài tập rơi đúng vào Vùng phát triển gần nhất (ZPD) theo lý thuyết sư phạm Vygotsky."*

4. **Hội đồng hỏi:** *"Context Budgeting giải quyết bài toán gì? Sao không dùng LLM tóm tắt đoạn chat?"*  
   **Bạn trả lời:** *"Dạ, nghiên cứu thực nghiệm trong bài thi Agent Arena Day 16 đã chứng minh rằng: Tóm tắt ngữ cảnh thô thiển làm mất các trích dẫn nguyên văn, khiến điểm grounding tụt thê thảm từ 92 xuống 45 điểm. Vì vậy, hệ thống của em dùng chiến thuật Token Budgeting: Cắt tỉa thông minh theo đoạn, giữ 15% Tool Reserve và kích hoạt Sentinel ép mô hình xuất kết quả khi sắp hết quota."*

5. **Hội đồng hỏi:** *"Hệ thống xử lý thế nào khi bị tấn công Prompt Injection?"*  
   **Bạn trả lời:** *"Dạ, hệ thống phòng thủ theo chiều sâu: Tầng Gateway có Zero-Width Sanitizer lọc bỏ các ký tự vô hình; Tầng Harness có NeMo Guardrails chặn các kịch bản phá vỡ quy tắc; Tầng Tool có AST Scanner và Denied Capabilities Policy cấm tiệt các lệnh shell và thao tác nguy hiểm."*

6. **Hội đồng hỏi:** *"MCP (Model Context Protocol) mang lại lợi ích gì so với REST API thông thường?"*  
   **Bạn trả lời:** *"Dạ, REST API chỉ là giao thức truyền nhận thô. MCP chuẩn hóa toàn bộ ngữ cảnh gồm Resources, Prompts và Tools theo chuẩn mở. Hệ thống của em vừa là Client vừa là Server, cho phép các công cụ hiện đại như Claude Desktop hoặc Cursor cắm thẳng vào hệ thống học tập để tra cứu mà không cần viết lại adapter."*

7. **Hội đồng hỏi:** *"Làm sao hệ thống không bị crash nếu mạng Internet bị đứt giữa chừng?"*  
   **Bạn trả lời:** *"Dạ, hệ thống có Thang bậc hạ cấp 4 tầng được quản lý bởi Circuit Breaker: Cloud Primary (Gemini Pro) $\rightarrow$ Cloud Secondary (Flash) $\rightarrow$ Local On-Device (GGUF Quantized) $\rightarrow$ Static Fallback. Kể cả mất mạng 100%, mô hình cục bộ vẫn trả lời được."*

8. **Hội đồng hỏi:** *"Sự khác biệt giữa RAG và Long-term Memory trong dự án là gì?"*  
   **Bạn trả lời:** *"Dạ, RAG là tri thức khách quan từ giáo trình và slide dùng chung cho toàn bộ sinh viên. Còn Long-term Memory là tri thức chủ quan lưu lịch sử học tập, các điểm yếu ngữ pháp và độ nắm vững kiến thức riêng biệt của từng sinh viên."*

9. **Hội đồng hỏi:** *"Em đo lường hiệu năng của hệ thống RAG bằng những chỉ số nào?"*  
   **Bạn trả lời:** *"Dạ, em dùng bộ chỉ số khoa học Ragas gồm: Faithfulness (độ trung thực), Answer Relevance (độ liên quan câu trả lời) và Context Precision (độ chuẩn xác của đoạn trích xuất), được đánh giá tự động trên tập Golden Dataset 50 câu hỏi đã qua kiểm định Cohen's Kappa."*

10. **Hội đồng hỏi:** *"Tại sao lại chọn DuckDB thay vì SQLite hay PostgreSQL để phân tích logs?"*  
    **Bạn trả lời:** *"Dạ, SQLite và PostgreSQL là hệ quản trị hướng dòng (Row-oriented) tối ưu cho giao dịch CRUD, nhưng rất chậm khi cần tính toán tổng hợp (Aggregate). DuckDB là hệ quản trị hướng cột (Columnar OLAP), chạy in-process siêu nhẹ trong RAM và cho tốc độ xử lý hàng triệu bản ghi telemetry nhanh gấp hàng chục lần."*

---

# CHƯƠNG 7. LỘ TRÌNH THỰC HÀNH 4 TUẦN & KỊCH BẢN DEMO LIVE 10 PHÚT

### Lộ trình 4 tuần hoàn thiện đồ án:

* **Tuần 1: Dựng Khung Nền Tảng (Foundation & Guards)**
  * Khởi tạo cấu trúc thư mục Monorepo `capstone-ai-platform/`.
  * Viết các bộ lọc an ninh: `input_guards.py` (Zero-width), `ast_security.py`.
  * Dựng FastAPI Gateway với Async Lifespan và SSE streaming.
* **Tuần 2: Tri Thức RAG & Động Cơ Thích Ứng (Knowledge & Adaptation)**
  * Xây dựng pipeline Hybrid RAG: BM25 + ChromaDB qua RRF Fusion và Cross-Encoder.
  * Hiện thực hóa thuật toán Dual Elo Rating (`elo.py`) và bộ theo dõi EMA.
  * Tích hợp Semantic Vector Cache để tối ưu chi phí.
* **Tuần 3: Tác Tử LangGraph & Giao Thức MCP (Agents & Protocol)**
  * Dựng đồ tác tử có chu trình phản tư (Generator $\rightarrow$ Critic Node).
  * Viết module `mcp_server/` và kết nối MCP Client.
  * Cài đặt Circuit Breaker 3 trạng thái và Local GGUF Engine.
* **Tuần 4: Đánh Giá, Chaos Testing & Đóng Gói Demo (Eval & Delivery)**
  * Chạy kịch bản Chaos Test (ngắt mạng, tiêm lỗi 429) để kiểm chứng tự phục hồi.
  * Chạy benchmark Ragas và tính toán chỉ số Cohen's Kappa.
  * Kết nối giao diện React 18 VNLearn, quay video demo và hoàn thiện poster.

---

### Kịch Bản Demo Live 10 Phút "Hút Hồn" Hội Đồng:

| Thời lượng | Nội dung trình diễn trực tiếp | Điểm nhấn kỹ thuật cần làm nổi bật |
|---|---|---|
| **Phút 0–2** | **Giới thiệu Bài toán & Kiến trúc tổng thể** | Mở slide kiến trúc 4 tầng, nêu rõ triết lý Enterprise AI Platform không phụ thuộc vào 1 API duy nhất. |
| **Phút 2–4** | **Trải nghiệm Học tập Thích ứng (Dual Elo + RAG)** | Cho sinh viên làm thử 1 câu trắc nghiệm. Trả lời đúng $\rightarrow$ Show ngay điểm Elo học sinh tăng, câu hỏi tự động khó hơn. Mở màn hình PDF xem trích dẫn nguồn RAG chính xác. |
| **Phút 4–6** | **Trình diễn Tối ưu Hóa (Semantic Vector Cache)** | Gõ lại một câu hỏi có ý nghĩa tương đương. Show bảng điều khiển: **Thời gian phản hồi 6ms, chi phí token = $0.00!** |
| **Phút 6–7** | **Trình diễn Phòng ngự An ninh (Security Shield)** | Cố tình paste một chuỗi Jailbreak có cài ký tự tàng hình `\u200b`. Show log: Hệ thống bóc sạch ký tự ẩn và NeMo Guardrails từ chối lịch sự. |
| **Phút 7–8** | **Màn "Ảo thuật" MCP (Interoperability)** | Mở ứng dụng **Claude Desktop** trên máy tính, gọi vào `Capstone MCP Server` để tra cứu điểm của học sinh. Hội đồng sẽ vô cùng bất ngờ vì hệ thống của bạn tương thích với hệ sinh thái quốc tế! |
| **Phút 8–9** | **Tiêm lỗi trực tiếp (Chaos Engineering Live Test)** | **Rút dây mạng hoặc tắt API Key!** Đặt câu hỏi tiếp: Circuit Breaker nhảy sang `OPEN`, hệ thống tự động chuyển sang mô hình Local GGUF trả lời trơn tru. |
| **Phút 9–10** | **Bảng điều khiển Observability & Kết luận** | Mở bảng phân tích DuckDB: Show biểu đồ TTFT, TPOT, chi phí token và chỉ số phát thải Carbon $kg\text{ }CO_2e$. Kết thúc bài bảo vệ trong sự thán phục của Hội đồng. |

---

> 💡 **Lời kết gửi các bạn sinh viên:**  
> Đồ án tốt nghiệp không chỉ là một bài tập để lấy điểm ra trường. Đây là **bản tuyên ngôn năng lực kỹ thuật** đầu đời của bạn trước các nhà tuyển dụng và cộng đồng công nghệ. Hãy xây dựng nó với niềm tự hào, sự chỉn chu và tư duy của một Kỹ sư Hệ thống AI xuất sắc! Chúc các bạn bảo vệ thành công rực rỡ!
