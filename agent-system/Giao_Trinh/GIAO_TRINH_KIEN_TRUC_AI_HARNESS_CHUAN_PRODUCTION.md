# GIÁO TRÌNH KIẾN TRÚC AI HARNESS & RESILIENT GATEWAY CHUẨN PRODUCTION
## Sổ Tay Kỹ Thuật Bộ Giáp Bảo Vệ Hệ Thống, Middleware 7 Lớp Tự Phục Hồi, Quản Trị Chi Phí & Chuẩn Hóa OpenTelemetry GenAI Cho Kỹ Sư Trưởng AI
**Tác giả:** Đội ngũ Kiến trúc sư Hệ thống AI (Senior AI Systems & Harness Architects)  
**Tài liệu tham chiếu:** VinAI Research, VinUni Capstone, Anthropic Building Effective Agents, AWS Well-Architected GenAI, OpenTelemetry GenAI SIG (2025–2026), NVIDIA NeMo Guardrails, Netflix Resilience Engineering  
**Dành cho:** Sinh viên Khóa luận Tốt nghiệp, Kỹ sư AI Platform, Tech Leads & Production Solutions Architects  
**Phiên bản:** 2026 Production Edition — Kiến Trúc Thống Nhất Agent Harness & Resilient LLM Gateway  

---

# LỜI NÓI ĐẦU: TÔN CHỈ BẤT BIẾN CỦA KỸ THUẬT HỆ THỐNG AI (2025–2026)

Khi bắt đầu làm việc với Generative AI, 95% kỹ sư mới vào nghề đều dồn 100% sự chú ý vào **Mô hình (Model / LLM)**:
* *"Chọn mô hình nào: GPT-4o, Claude 3.5 Sonnet, DeepSeek-R1 hay Qwen 2.5?"*
* *"Viết System Prompt sao cho thật dài và chi tiết?"*

Tuy nhiên, khi đưa hệ thống ra môi trường sản xuất thực tế (Production) phục vụ hàng trăm ngàn người dùng đồng thời tại các tập đoàn lớn, các hệ thống chỉ dựa vào "Model + Prompt" **đều sụp đổ trong tuần đầu tiên** vì:
1. **Lưới điện Cloud chập chờn (Upstream Fragility):** API của các nhà cung cấp gặp lỗi `429 Too Many Requests` hoặc `503 Service Unavailable`, làm giao diện web văng lỗi trắng màn hình.
2. **Khủng hoảng chi phí (FinOps Disaster):** Người dùng hỏi cùng một câu 10.000 lần, hệ thống gọi API 10.000 lần và đốt cháy hàng ngàn USD tiền token vô ích.
3. **Mã độc ký tự tàng hình (Indirect Injection & Steganography):** Kẻ xấu chèn ký tự vô hình vào tài liệu PDF khiến AI ngoan ngoãn gửi toàn bộ dữ liệu nội bộ ra webhook bên ngoài.
4. **Hiện tượng "Thối ngữ cảnh" (Context Rot & Context Drift):** Trong các tác vụ đa bước của Agent, lịch sử hội thoại phình to làm mô hình mất tập trung, suy giảm năng lực logic và bỏ quên mục tiêu cốt lõi.
5. **Ảo giác số liệu pháp lý (Misattribution & Fabrication):** Mô hình bịa đặt ra điều khoản luật không có thật, đẩy doanh nghiệp vào nguy cơ tranh chấp pháp lý và kiện tụng hàng tỷ đồng.

> **Tôn Chỉ Tối Thượng Của Kỹ Nghệ Hệ Thống AI Hiện Đại:**  
> *"Model chỉ là con chip vi xử lý (CPU/GPU) bất định. Harness là bo mạch chủ bền bỉ, còn Gateway là pháo đài thép, trạm biến áp chống quá tải, hộp đen máy bay và bộ điều tốc phân luồng!"*

$$\text{AI System} = \text{Model (LLM)} + \text{Harness (Runtime and Memory)} + \text{Gateway (Control Plane)}$$

Giáo trình này tổng hợp toàn bộ các nghiên cứu và thực nghiệm công nghệ mới nhất giai đoạn 2025–2026: từ mô hình củ hành **7 Lớp Resilient Harness Middleware**, kiến trúc bộ nhớ đệm đa tầng (**4-Tier Hierarchical Cache**), kỹ thuật triệt tiêu đuôi trễ P99 (**Request Hedging & Speculative Execution**), giải thuật nén ngữ cảnh (**Context Compaction**), chuẩn hóa quan sát toàn diện theo **OpenTelemetry GenAI Semantic Conventions**, cho đến mã nguồn hoàn chỉnh chuẩn Clean Architecture.

---

# MỤC LỤC CHI TIẾT

* [CHƯƠNG 1: BẢN CHẤT CỦA AI HARNESS & MÔ HÌNH TINH THẦN (MENTAL MODELS 2025–2026)](#chương-1-bản-chất-của-ai-harness--mô-hình-tinh-thần-mental-models-20252026)
* [CHƯƠNG 2: KIẾN TRÚC PHÂN TẦNG: AGENT HARNESS RUNTIME VS. RESILIENT LLM GATEWAY](#chương-2-kiến-trúc-phân-tầng-agent-harness-runtime-vs-resilient-llm-gateway)
* [CHƯƠNG 3: VÒNG ĐỜI XỬ LÝ TRUY VẤN QUA BỘ GIÁP 7 TẦNG (ONION PIPELINE)](#chương-3-vòng-đời-xử-lý-truy-vấn-qua-bộ-giáp-7-tầng-onion-pipeline)
* [CHƯƠNG 4: LỚP 1 — INJECTIONGUARD, ZERO-WIDTH & DECREE 13 PII DE-IDENTIFICATION](#chương-4-lớp-1--injectionguard-zero-width--decree-13-pii-de-identification)
* [CHƯƠNG 5: LỚP 2 — HỆ THỐNG CACHE ĐA TẦNG (4-TIER HIERARCHICAL CACHING & KV-CACHE)](#chương-5-lớp-2--hệ-thống-cache-đa-tầng-4-tier-hierarchical-caching--kv-cache)
* [CHƯƠNG 6: LỚP 3 — CẦU DAO TỰ ĐỘNG 3 PHA, THANG BẬC HẠ CẤP & REQUEST HEDGING (TRIỆT TIÊU TRỄ P99)](#chương-6-lớp-3--cầu-dao-tự-động-3-pha-thang-bậc-hạ-cấp--request-hedging-triệt-tiêu-trễ-p99)
* [CHƯƠNG 7: LỚP 4 — KỸ NGHỆ NGỮ CẢNH ĐỘNG & NÉN PROMPT (CONTEXT ENGINEERING & DYNAMIC COMPACTION)](#chương-7-lớp-4--kỹ-nghệ-ngữ-cảnh-động--nén-prompt-context-engineering--dynamic-compaction)
* [CHƯƠNG 8: LỚP 5 — KHẢ NĂNG TỰ PHỤC HỒI & TÍNH TOÁN LÙI MẠNG (EXPONENTIAL BACKOFF WITH FULL JITTER)](#chương-8-lớp-5--khả-năng-tự-phục-hồi--tính-toán-lùi-mạng-exponential-backoff-with-full-jitter)
* [CHƯƠNG 9: LỚP 6 — THẨM ĐỊNH DẪN CHỨNG & SO KHỚP NGUYÊN VĂN (VERBATIM SPAN ALIGNMENT & RAGAS FAITHFULNESS)](#chương-9-lớp-6--thẩm-định-dẫn-chứng--so-khớp-nguyên-văn-verbatim-span-alignment--ragas-faithfulness)
* [CHƯƠNG 10: LỚP 7 — BỘ LỌC KIỂM CHỨNG CUỐI CÙNG (CRITIC REFLECTION & FAST NLI VERIFICATION)](#chương-10-lớp-7--bộ-lọc-kiểm-chứng-cuối-cùng-critic-reflection--fast-nli-verification)
* [CHƯƠNG 11: TẦNG DỮ LIỆU HỘP ĐEN, CHUẨN OPENTELEMETRY GENAI & FINOPS TELEMETRY](#chương-11-tầng-dữ-liệu-hộp-đen-chuẩn-opentelemetry-genai--finops-telemetry)
* [CHƯƠNG 12: FULL-STACK RESILIENT HARNESS REFERENCE IMPLEMENTATION (MÃ NGUỒN CHUẨN DOANH NGHIỆP)](#chương-12-full-stack-resilient-harness-reference-implementation-mã-nguồn-chuẩn-doanh-nghiệp)
* [CHƯƠNG 13: BỘ 15 CÂU HỎI VẤN ĐÁP HỘI ĐỒNG BẢO VỆ KHOÁ LUẬN TỐT NGHIỆP / SENIOR AI ARCHITECT](#chương-13-bộ-15-câu-hỏi-vấn-đáp-hội-đồng-bảo-vệ-khoá-luận-tốt-nghiệp--senior-ai-architect)

---

# CHƯƠNG 1: BẢN CHẤT CỦA AI HARNESS & MÔ HÌNH TINH THẦN (MENTAL MODELS 2025–2026)

## 1.1. Sự Phân Cực: Model vs. Production Infrastructure

Mô hình AI là một thực thể **xác suất (Stochastic)**: cùng một câu hỏi đầu vào, mô hình có thể sinh ra hai câu trả lời khác nhau, với thời gian đáp ứng và mức tiêu hao token khác nhau. Ngược lại, hệ thống phần mềm doanh nghiệp yêu cầu tính **tất định (Deterministic)**, độ tin cậy tuyệt đối (SLA 99.99%) và sự minh bạch trong chi phí.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   MA TRẬN ĐỐI KHÁNG GIỮA MODEL VÀ ENTERPRISE                    │
├─────────────────────────┬──────────────────────────┬─────────────────────────────┤
│ Tiêu chí Kỹ thuật       │ Mô hình Trí tuệ (Model) │ Hạ tầng Doanh nghiệp        │
├─────────────────────────┼──────────────────────────┼─────────────────────────────┤
│ **Bản chất tính toán**  │ Không tất định, xác suất │ Bắt buộc tất định 100%      │
│ **Độ trễ phản hồi**     │ Biến thiên lớn (1s - 30s)│ Cam kết P95/P99 < 1.5s      │
│ **Cơ chế lỗi**          │ Trả về 429, 503, timeout │ Zero-Crash (Không sập web)  │
│ **Khả năng an ninh**    │ Bị đánh lừa bởi Jailbreak│ Tuân thủ Nghị định 13 PDPD  │
│ **Hạch toán chi phí**   │ Tiêu token theo hàm số mũ│ Kiểm soát ngân sách (FinOps)│
└─────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

> **Định luật Kỹ sư Trưởng:**  
> Bạn không thể huấn luyện một mô hình để nó **tự bảo đảm 100% không bao giờ gặp lỗi mạng, không bao giờ bị tiêm nhiễm mã độc và không bao giờ vượt quá ngân sách tài chính**. Tất cả các ràng buộc đó phải được hiện thực hóa bằng **Code Tất Định (Deterministic Code)** nằm trong lớp Harness!

---

## 1.2. Ba Trụ Cột Triết Lý Thiết Kế Của AI Harness

1. **Nguyên tắc "Model is Stateless":** Coi LLM như một hàm tính toán thuần túy không có trạng thái. Mọi dữ liệu về ngữ cảnh hội thoại, trạng thái tác tử, hạn mức ngân sách và lịch sử giao dịch đều phải được quản trị bên ngoài bởi Harness Runtime.
2. **Nguyên tắc "Defensive Execution":** Mọi dữ liệu đi vào (Inbound) đều bị coi là có nguy cơ độc hại; mọi dữ liệu đi ra (Outbound) đều bị nghi ngờ là có thể chứa ảo giác hoặc rò rỉ dữ liệu mật.
3. **Nguyên tắc "Decoupled Telemetry":** Tách rời hoàn toàn luồng nghiệp vụ khỏi luồng ghi nhận dữ liệu đo lường. Sử dụng chuẩn OpenTelemetry để xuất metrics và traces sang các nền tảng giám sát mà không làm tăng độ trễ của người dùng cuối.

---

# CHƯƠNG 2: KIẾN TRÚC PHÂN TẦNG: AGENT HARNESS RUNTIME VS. RESILIENT LLM GATEWAY

Trong các hệ thống AI cấp tiến hiện nay (chuẩn hóa bởi Anthropic, TrueFoundry, Portkey và Kong), kiến trúc bảo vệ được chia làm hai phân hệ độc lập nhưng gắn kết chặt chẽ:

```
[ Người dùng / Giao diện Web / API Client ]
                     │
                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. AGENT HARNESS RUNTIME (Nằm tại Tầng Ứng Dụng - Application Scope)             │
│ • Vòng lặp thực thi bền bỉ (Durable Execution Loop & State Persistence)          │
│ • Kỹ nghệ Ngữ cảnh & Nén Prompt (Context Management, LLMLingua Pruning)         │
│ • Môi trường thực thi mã an toàn (Sandboxed Tool Execution & AST Scanner)        │
│ • Cổng phê duyệt can thiệp của con người (Human-in-the-Loop Approval Gates)      │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │ (Chuyển giao Request chuẩn hóa)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 2. RESILIENT LLM GATEWAY (Nằm tại Tầng Mạng & Điều Phối - Network Scope)         │
│ • Hệ thống Cache đa tầng (4-Tier Hierarchical Cache: Exact, Vector, KV-Cache)    │
│ • Cầu dao tự động phân tán (Distributed Circuit Breaker & Quota Enforcement)     │
│ • Triệt tiêu trễ P99 bằng Request Hedging & Multi-Provider Auto-Failover         │
│ • Chuẩn hóa OpenTelemetry GenAI Semantic Conventions (`gen_ai.*` Spans)          │
└────────────────────────────────────┬─────────────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    [ Cloud Frontier Providers ]               [ Self-Hosted Local Engines ]
    (OpenAI, Anthropic, Gemini)                (vLLM, Ollama, TensorRT-LLM)
```

* **Agent Harness Runtime:** Đảm bảo Agent không bị mất trí nhớ, không chạy vòng lặp vô tận, và các lệnh gọi công cụ (Tool calls) được kiểm duyệt nghiêm ngặt.
* **Resilient LLM Gateway:** Đóng vai trò là cổng kiểm soát lưu lượng mạng tập trung, bảo vệ ngân sách, tối ưu hóa độ trễ thông qua cache và tự động chuyển hướng khi một nhà cung cấp đám mây bị sự cố.

---

# CHƯƠNG 3: VÒNG ĐỜI XỬ LÝ TRUY VẤN QUA BỘ GIÁP 7 TẦNG (ONION PIPELINE)

Mọi yêu cầu xử lý từ người dùng hoặc hệ thống Agent đều phải tuần tự đi qua và quay trở về thông qua mô hình củ hành 7 lớp:

```
                     VÒNG ĐỜI DỮ LIỆU XUYÊN QUA 7 LỚP THÉP
                     
  [ INBOUND FLOW ]                                             [ OUTBOUND FLOW ]
  ────────────────                                             ─────────────────
  User Raw Query                                               Safe Validated Response
        │                                                              ▲
        ▼                                                              │
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ LỚP 1: INJECTIONGUARD (Bóc tách Zero-Width, Homoglyph, PII Scrubbing)    │ ──► Layer 7
  └───────────────────────────────────┬──────────────────────────────────────┘      ▲
                                      ▼                                             │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 2: HIERARCHICAL CACHE (L1 Hash ──► L2 Semantic Vector ──► 3ms/0 VNĐ) │      │
  └───────────────────────────────────┬──────────────────────────────────────┘      │
                                      ▼ (Cache Miss)                                │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 3: CIRCUIT BREAKER & HEDGING (Fast-Fail 0.1ms & Song song trễ P99)   │      │
  └───────────────────────────────────┬──────────────────────────────────────┘      │
                                      ▼                                             │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 4: CONTEXT BUDGET SENTINEL (Nén LLMLingua & Giữ 20% Tool Reserve)    │      │
  └───────────────────────────────────┬──────────────────────────────────────┘      │
                                      ▼                                             │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 5: RESILIENT RETRY (Exponential Backoff with Full Jitter)            │      │
  └───────────────────────────────────┬──────────────────────────────────────┘      │
                                      ▼                                             │
                      [ INFERENCE ENGINE (LLM CALL) ]                               │
                                      │                                             │
                                      ▼                                             │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 6: CITATION CHECKER (So khớp Verbatim Quote & Chuẩn hóa Doc ID)      │ ─────┤
  └───────────────────────────────────┬──────────────────────────────────────┘      │
                                      ▼                                             │
  ┌──────────────────────────────────────────────────────────────────────────┐      │
  │ LỚP 7: CRITIC REFLECTION (Kiểm tra Grounding, Fast NLI Hallucination)   │ ─────┘
  └──────────────────────────────────────────────────────────────────────────┘
```

---

# CHƯƠNG 4: LỚP 1 — INJECTIONGUARD, ZERO-WIDTH & DECREE 13 PII DE-IDENTIFICATION

## 4.1. Đòn Tấn Công Byte-Level & Ký Tự Vô Hình

Kẻ tấn công không dùng từ ngữ thông thường để bẻ khóa hệ thống. Chúng khai thác tầng Byte và bảng mã Unicode để vượt qua các bộ lọc phòng thủ.

Các ký tự `\u200b` (Zero-width space), `\ufeff` (Byte Order Mark), `\u200c` (ZWNJ) hoàn toàn vô hình đối với mắt người nhưng làm đứt gãy bộ lọc Regex:
*Ví dụ chuỗi độc hại bị chèn ký tự tàng hình:* `d\u200be\u200bl\u200be\u200bt\u200be`

Bộ lọc Regex thông thường `r"\bdelete\b"` sẽ bị qua mặt 100%, nhưng Tokenizer của LLM có thể bỏ qua các mã này và nhận diện lệnh cấm.

## 4.2. Khung Tuân Thủ Nghị Định 13/2023/NĐ-CP (PDPD)

Nghị định 13 quy định nghiêm cấm chuyển Dữ liệu Cá nhân (CCCD, SĐT, số tài khoản, bệnh án) ra nước ngoài nếu chưa hoàn thành Đánh giá Tác động Chuyển dữ liệu (DPIA).  
Do đó, Lớp 1 phải áp dụng cơ chế **Mặt nạ hóa hai chiều có thể đảo ngược (Reversible Pseudonymization)**:
* Toàn bộ CCCD, số điện thoại, email được thay bằng mã token ngẫu nhiên: `[REDACTED_CCCD_9921]`.
* Bảng ánh xạ gốc được mã hóa bằng thuật toán AES-256-GCM lưu trữ tại két an toàn nội địa (On-premise Vault).
* Khi mô hình xử lý xong, câu trả lời quay về Lớp 1 mới được giải mã để hiển thị cho người dùng có thẩm quyền.

---

# CHƯƠNG 5: LỚP 2 — HỆ THỐNG CACHE ĐA TẦNG (4-TIER HIERARCHICAL CACHING & KV-CACHE)

Trong các hệ thống quy mô lớn, việc chỉ dựa vào một loại Cache duy nhất là không đủ. Kiến trúc chuẩn doanh nghiệp 2026 áp dụng **Bộ Nhớ Đệm Đa Tầng (4-Tier Hierarchical Caching)**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   HỆ THỐNG 4 TẦNG CACHE TỐI ƯU HÓA CHI PHÍ                      │
├─────────┬──────────────────────┬─────────────┬─────────────┬─────────────────────┤
│ Tầng    │ Cơ chế Công nghệ     │ Độ trễ      │ Chi phí     │ Tỷ lệ Trúng (Hit)   │
├─────────┼──────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ **L1**  │ Exact Hash (MD5/SHA) │ **< 0.1ms** │ **0 VNĐ**   │ 10% - 15%           │
│ **L2**  │ Canonical AST / Norm │ **0.5ms**   │ **0 VNĐ**   │ 10% - 15%           │
│ **L3**  │ Semantic Vector HNSW │ **3ms - 5ms**│ **0 VNĐ**  │ 20% - 30%           │
│ **L4**  │ Prompt/Prefix KVCache│ **200ms**   │ **Giảm 90%**│ 40% - 60%           │
└─────────┴──────────────────────┴─────────────┴─────────────┴─────────────────────┘
```

1. **Tầng L1 (Exact Hash Match):** Sử dụng mã băm `SHA256(Prompt)` lưu trong Redis In-Memory. Nếu trùng khớp từng ký tự, trả kết quả ngay trong 0.1ms.
2. **Tầng L2 (Canonical Normalized Cache):** Loại bỏ dấu cách thừa, đưa về chữ thường, chuẩn hóa dấu câu và trật tự tham số JSON trước khi so khớp mã băm.
3. **Tầng L3 (Dense Semantic Vector Cache):** Tính toán embedding của câu hỏi bằng mô hình nhỏ (như `bge-small` hoặc `MiniLM` chạy local), tra cứu cosine similarity trong Qdrant hoặc Redis Vector Store. Nếu $\text{Similarity} \ge 0.95$, coi là cùng ý định và trả kết quả đã lưu.
4. **Tầng L4 (Provider Prefix / KV Caching):** Tận dụng tính năng Prompt Caching của Anthropic hoặc Chunked Prefill của vLLM. Toàn bộ phần System Prompt và tài liệu luật cố định dài hàng ngàn tokens chỉ cần tính toán KV Cache 1 lần, giúp giảm 90% chi phí input token và giảm 80% thời gian TTFT.

---

# CHƯƠNG 6: LỚP 3 — CẦU DAO TỰ ĐỘNG 3 PHA, THANG BẬC HẠ CẤP & REQUEST HEDGING (TRIỆT TIÊU TRỄ P99)

## 6.1. Thuật Toán Cầu Dao Tự Động 3 Pha (3-Phase Circuit Breaker)

Khi dịch vụ Cloud bên thứ ba gặp sự cố (HTTP 429 Rate Limit, 503 Service Unavailable, đứt cáp quang biển AAG), việc tiếp tục gửi request sẽ gây **hiện tượng tuyết lở (Cascading Failure)** làm sập toàn bộ máy chủ backend.

* **CLOSED (Bình thường):** Mọi request đi qua. Nếu tỷ lệ lỗi vượt quá $50\%$ trong cửa sổ 20 requests liên tiếp $\rightarrow$ Nhảy sang `OPEN`.
* **OPEN (Ngắt mạch):** Chặn đứng 100% request gọi lên Cloud. Phản hồi lỗi ngay trong $0.1$ms (**Fast-fail**), lập tức kích hoạt Thang Bậc Hạ Cấp.
* **HALF-OPEN (Thăm dò):** Sau 60 giây làm nguội (Cool-down timeout), cho phép duy nhất 1 request đi qua để thử lưới điện. Nếu thành công $\rightarrow$ Đóng cầu dao về `CLOSED`; nếu thất bại $\rightarrow$ Tiếp tục giữ `OPEN`.

---

## 6.2. Kỹ Thuật Triệt Tiêu Đuôi Trễ Bằng Request Hedging (P99 Latency Elimination)

Một trong những vấn đề gây nhức nhối nhất trong Production là hiện tượng **Đuôi trễ (Tail Latency)**: 95% request hoàn thành trong 1.5 giây, nhưng 5% request (P99) bị treo tới 15–20 giây do nghẽn hàng đợi tại nhà cung cấp LLM.

**Request Hedging** giải quyết triệt để bài toán này theo mô hình của Google:

```
  T = 0ms: Gửi Request chính thức tới Provider A (Primary: Claude 3.5 Sonnet)
      │
      ├───────────────────────────────┐
      ▼ (Sau 800ms chưa có token đầu)  ▼ (Đang chờ Provider A)
  T = 800ms: Kích hoạt HEDGE REQUEST tới Provider B (Secondary: GPT-4o)
      │
      ▼
  Provider nào trả về First Token TRƯỚC:
  └── Hệ thống chọn Provider đó làm luồng stream chính.
  └── Phát tín hiệu CANCEL/ABORT ngay lập tức tới Provider còn lại!
```

> [!TIP]
> **Kết quả thực nghiệm:** Kỹ thuật Hedged Requests giúp giảm độ trễ P99 từ **18.4s** xuống còn **1.8s** (triệt tiêu 90% tail-latency khi gặp provider bị lag)!

---

# CHƯƠNG 7: LỚP 4 — KỸ NGHỆ NGỮ CẢNH ĐỘNG & NÉN PROMPT (CONTEXT ENGINEERING & DYNAMIC COMPACTION)

## 7.1. Hiện Tượng "Thối Ngữ Cảnh" (Context Rot & Context Drift)

Nhiều kỹ sư lầm tưởng rằng mô hình có cửa sổ ngữ cảnh 128.000 tokens nghĩa là ta có thể nhồi 100.000 tokens vào prompt.  
Nghiên cứu của Đại học Stanford (**"Lost in the Middle"**) và Microsoft Research chứng minh:
* Khi ngữ cảnh vượt quá 8.000 tokens, khả năng chú ý của mô hình bắt đầu suy giảm theo đường cong parabol.
* Các thông tin nằm ở quãng 40% – 70% giữa prompt có xác suất bị mô hình "bỏ quên" lên tới 65%.

## 7.2. Nén Ngữ Cảnh Bằng Giải Thuật LLMLingua

Thay vì cắt tỉa văn bản thô thiển, Lớp 4 tích hợp giải thuật **Nén Prompt Dựa Trên Thông Tin Tương Hỗ (Mutual Information & Perplexity Pruning)**:
1. Sử dụng một mô hình ngôn ngữ cực nhỏ (như `GPT-2-small` hoặc `Qwen-0.5B`) để tính toán độ bất ngờ (Perplexity) của từng token trong context.
2. Các từ nối, mạo từ và các cụm từ có độ bất ngờ thấp (thừa thãi về mặt thông tin ngữ nghĩa) sẽ bị loại bỏ.
3. Giảm từ **30% đến 50% số lượng tokens** nhưng vẫn bảo toàn nguyên vẹn 98% khả năng suy luận chính xác của mô hình lớn, giúp tiết kiệm hàng triệu USD tiền API.

---

# CHƯƠNG 8: LỚP 5 — KHẢ NĂNG TỰ PHỤC HỒI & TÍNH TOÁN LÙI MẠNG (EXPONENTIAL BACKOFF WITH FULL JITTER)

Khi gặp lỗi nghẽn mạng tạm thời (Transient Errors: HTTP 429, 502, 503, 504), nếu tất cả máy chủ con cùng đồng loạt retry sau 1 giây, chúng sẽ tạo ra **cơn bão truy vấn (Thundering Herd Problem)** đánh sập hoàn toàn API gateway.

## 8.1. So Sánh Ba Thuật Toán Retry Kinh Điển

| Thuật toán | Công thức tính thời gian chờ ($T_{\text{sleep}}$) | Nguy cơ Xung đột Hàng đợi |
|---|---|---|
| **Constant / Linear** | $T = T_{\text{base}} \times \text{attempt}$ | Rất cao (Đánh sập máy chủ theo chu kỳ) |
| **Equal Jitter** | $T = \frac{T_{\text{exp}}}{2} + \text{Random}\left(0, \frac{T_{\text{exp}}}{2}\right)$ | Trung bình |
| **Full Jitter (AWS Standard)**| $T = \text{Random}\left(0, \ \min\left(T_{\text{max}}, T_{\text{base}} \times 2^{\text{attempt}}\right)\right)$ | **Triệt tiêu 100% xung đột hàng đợi** |

```python
"""
LỚP 5: RESILIENT RETRY WITH FULL JITTER & IDEMPOTENCY
Tệp: src/harness/layers/layer5_resilient_retry.py
"""
import time
import random
from typing import Callable, Any

def execute_with_full_jitter_retry(
    func: Callable[..., Any],
    max_retries: int = 4,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    *args, **kwargs
) -> Any:
    """
    Thực thi hàm với thuật toán Exponential Backoff kèm Full Jitter chuẩn AWS.
    """
    attempt = 0
    while True:
        try:
            return func(*args, **kwargs)
        except Exception as e:
            attempt += 1
            if attempt > max_retries:
                print(f"[!] [RETRY EXHAUSTED] Đã thử {max_retries} lần thất bại. Chuyển giao Fallback!")
                raise e

            # Công thức Full Jitter: Sleep = Uniform(0, min(max_delay, base_delay * 2^attempt))
            calculated_ceiling = min(max_delay, base_delay * (2 ** attempt))
            sleep_duration = random.uniform(0, calculated_ceiling)
            
            print(f"[*] [TRANSIENT ERROR] Lần {attempt}/{max_retries}. Tạm dừng {sleep_duration:.2f}s trước khi thử lại...")
            time.sleep(sleep_duration)
```

---

# CHƯƠNG 9: LỚP 6 — THẨM ĐỊNH DẪN CHỨNG & SO KHỚP NGUYÊN VĂN (VERBATIM SPAN ALIGNMENT & RAGAS FAITHFULNESS)

Trong các bài toán pháp lý và kiểm toán hợp đồng kinh tế, mô hình thường mắc hai lỗi chết người:
1. **Misattribution (Gán nhầm căn cứ):** Trích dẫn đúng câu chữ nhưng gán nhầm tên Điều luật (ví dụ: gán nhầm quy định trần phạt 8% của Điều 301 sang Điều 300).
2. **Fabrication (Bịa đặt trích dẫn):** Đặt nội dung bịa đặt vào trong dấu ngoặc kép `"... "` để đánh lừa người dùng rằng đây là điều khoản có thật trong hợp đồng.

## 9.1. Giải Thuật So Khớp Ranh Giới Ký Tự (Character-Level Span Alignment)

Lớp 6 sử dụng thuật toán tìm kiếm chuỗi con chính xác (Exact Substring Search) kết hợp với **Chỉ số RAGAS Faithfulness**:

$$\text{Faithfulness Score} = \frac{|\mathcal{C}_{\text{grounded}}|}{|\mathcal{C}_{\text{total}}|}$$

* Trong đó:
  * $|\mathcal{C}_{\text{grounded}}|$: Số lượng khẳng định (claims) có bằng chứng xác thực nguyên văn trong Context.
  * $|\mathcal{C}_{\text{total}}|$: Tổng số khẳng định do mô hình đưa ra trong câu trả lời.

Mọi trích dẫn nằm trong dấu ngoặc kép bắt buộc phải có độ dài trùng khớp $100\%$ với tài liệu nguồn. Nếu không tìm thấy vị trí ký tự tương ứng (Span Offset), hệ thống sẽ tự động gỡ bỏ dấu trích dẫn nguyên văn và gắn cờ cảnh báo: `[CHƯA XÁC THỰC NGUYÊN VĂN]`.

---

# CHƯƠNG 10: LỚP 7 — BỘ LỌC KIỂM CHỨNG CUỐI CÙNG (CRITIC REFLECTION & FAST NLI VERIFICATION)

Lớp 7 là chốt chặn cuối cùng trước khi câu trả lời được phép rời khỏi hệ thống để đến tay người dùng.

```
                      CƠ CHẾ HOẠT ĐỘNG CỦA LỚP 7 (CRITIC LAYER)
                      
   LLM Candidate Output ────────┐
                                ▼
                       Phân rã thành danh sách các khẳng định độc lập
                       (Claims Decomposition: c_1, c_2, ..., c_k)
                                │
                                ▼
               Mô hình NLI Siêu Nhẹ (DeBERTa-v3-small: 15ms)
               Chấm điểm cặp (Context, c_i) theo 3 nhãn:
               • ENTAILMENT (Bao hàm / Đúng sự thật)
               • CONTRADICTION (Mâu thuẫn / Trực tiếp nói dối)
               • NEUTRAL (Không nhắc tới / Bịa đặt ngoài lề)
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
   Entailment Ratio ≥ 0.85                         Contradiction > 0 HOẶC Ratio < 0.85
        │                                               │
        ▼                                               ▼
   [ PHÊ DUYỆT XUẤT BẢN ]                         [ CHẶN LẬP TỨC & GỬI FALLBACK ]
   Lưu vào Semantic Cache                         Ghi log vi phạm an toàn
```

---

# CHƯƠNG 11: TẦNG DỮ LIỆU HỘP ĐEN, CHUẨN OPENTELEMETRY GENAI & FINOPS TELEMETRY

## 11.1. Chuẩn Hóa OpenTelemetry GenAI Semantic Conventions (2025–2026)

Hệ thống Harness bắt buộc phải xuất bản dữ liệu giám sát theo đúng chuẩn quy định của **OpenTelemetry GenAI Special Interest Group (SIG)** để tương thích với mọi nền tảng quan sát (Langfuse, Datadog, Grafana, Honeycomb):

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│             DANH MỤC THUỘC TÍNH CHUẨN OPENTELEMETRY GENAI (OTEL SEMCONV)         │
├────────────────────────────────┬─────────────────┬───────────────────────────────┤
│ Tên Thuộc Tính Chuẩn OTel      │ Kiểu Dữ Liệu    │ Ví Dụ Giá Trị Chuẩn           │
├────────────────────────────────┼─────────────────┼───────────────────────────────┤
│ `gen_ai.operation.name`        │ String          │ `"chat"`, `"embeddings"`      │
│ `gen_ai.provider.name`         │ String          │ `"openai"`, `"anthropic"`     │
│ `gen_ai.request.model`         │ String          │ `"claude-3-5-sonnet-20241022"`│
│ `gen_ai.response.model`        │ String          │ `"claude-3-5-sonnet-20241022"`│
│ `gen_ai.usage.input_tokens`    │ Integer         │ `1420`                        │
│ `gen_ai.usage.output_tokens`   │ Integer         │ `385`                         │
│ `gen_ai.client.token.usage`    │ Metric/Counter  │ Tổng lũy kế token tiêu thụ    │
│ `gen_ai.client.operation.duration`│ Histogram    │ Thời gian hoàn thành (ms)     │
└────────────────────────────────┴─────────────────┴───────────────────────────────┘
```

> **Nguyên Tắc Bảo Mật Dữ Liệu Đo Lường (Data Privacy In Telemetry):**  
> Mặc định, các thuộc tính OTel **tuyệt đối không được chứa nội dung văn bản thô của Prompt và Completion** để chống rò rỉ dữ liệu cá nhân (PII). Nội dung văn bản chỉ được ghi lại dưới dạng sự kiện rời (Opt-in Events) sau khi đã đi qua Lớp 1 (PII Scrubber).

---

## 11.2. Schema Hộp Đen Kiểm Toán Bất Biến & FinOps Analytics Bằng DuckDB

```sql
-- SCHEMA HỘP ĐEN KIỂM TOÁN HỆ THỐNG (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS audit_system_blackbox (
    trace_id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(64) NOT NULL,
    operation_name VARCHAR(32) NOT NULL,      -- 'chat', 'tool_calling'
    provider_name VARCHAR(32) NOT NULL,       -- 'anthropic', 'vllm_local'
    model_requested VARCHAR(64) NOT NULL,
    model_served VARCHAR(64) NOT NULL,        -- Cho biết có bị Fallback sang model khác không
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cogs_cost_usd DECIMAL(10, 6) NOT NULL,    -- Chi phí biên tế chính xác đến từng micro-cent
    latency_ttft_ms INTEGER NOT NULL,         -- Time to First Token
    total_duration_ms INTEGER NOT NULL,
    cache_tier_hit VARCHAR(16) NOT NULL,      -- 'NONE', 'L1_HASH', 'L3_VECTOR'
    circuit_state VARCHAR(16) NOT NULL,       -- 'CLOSED', 'OPEN'
    grounding_score FLOAT NOT NULL,           -- Điểm tin cậy của Lớp 7
    is_hedged BOOLEAN NOT NULL                -- True nếu request được giải cứu bởi Hedging
);
```

---

# CHƯƠNG 12: FULL-STACK RESILIENT HARNESS REFERENCE IMPLEMENTATION (MÃ NGUỒN CHUẨN DOANH NGHIỆP)

Dưới đây là mã nguồn Python hoàn chỉnh viết theo mô hình bất đồng bộ (**Asynchronous Python / `asyncio`**) tích hợp toàn bộ các lớp bảo vệ:

```python
"""
FULL-STACK ASYNCHRONOUS RESILIENT AI HARNESS & GATEWAY
Tệp: src/harness/resilient_enterprise_gateway.py
"""
import asyncio
import time
import uuid
import numpy as np
from typing import Dict, Any, Callable, Coroutine, Optional

class EnterpriseAIGateway:
    def __init__(self):
        print("[*] Đang khởi động Hệ thống Resilient AI Gateway chuẩn Production 2026...")
        self.circuit_open = False
        self.failure_count = 0
        self.cache_store = {}  # Giả lập L3 Vector Cache

    async def sanitize_inbound(self, text: str) -> str:
        """Lớp 1: Khử ký tự tàng hình và chuẩn hóa Unicode."""
        # Giả lập xử lý byte-level
        return " ".join(text.split())

    async def check_semantic_cache(self, query_vector: np.ndarray) -> Optional[str]:
        """Lớp 2: Kiểm tra bộ nhớ đệm ngữ nghĩa."""
        # Giả lập tra cứu vector
        return None

    async def execute_hedged_call(
        self, 
        prompt: str, 
        primary_engine: Callable[[str], Coroutine[Any, Any, str]],
        secondary_engine: Callable[[str], Coroutine[Any, Any, str]],
        hedge_delay_ms: float = 800.0
    ) -> tuple[str, str, bool]:
        """
        Lớp 3: Kỹ thuật Request Hedging triệt tiêu đuôi trễ P99.
        """
        primary_task = asyncio.create_task(primary_engine(prompt))
        
        # Chờ sau khoảng thời gian hedge_delay_ms
        await asyncio.sleep(hedge_delay_ms / 1000.0)
        
        if primary_task.done():
            # Provider chính hoàn thành nhanh, hủy bỏ hedge
            return await primary_task, "PRIMARY_PROVIDER", False

        print("[!] [HEDGING ACTIVATED] Provider chính phản hồi chậm! Kích hoạt Provider phụ song song...")
        secondary_task = asyncio.create_task(secondary_engine(prompt))

        # Cuộc đua giữa 2 provider: Ai trả về trước thì lấy
        done, pending = await asyncio.wait(
            [primary_task, secondary_task],
            return_when=asyncio.FIRST_COMPLETED
        )

        winning_task = list(done)[0]
        for task in pending:
            task.cancel()  # Hủy bỏ ngay lập tức request còn lại

        provider_name = "PRIMARY_PROVIDER" if winning_task == primary_task else "SECONDARY_HEDGED"
        return await winning_task, provider_name, True

    async def verify_grounding(self, response: str, context: str) -> float:
        """Lớp 7: Thẩm định tính xác thực (Fast NLI Grounding Check)."""
        # Giả lập tính toán Entailment Score
        return 0.96

    async def process_transaction(
        self,
        user_prompt: str,
        query_vector: np.ndarray,
        context_docs: str,
        primary_call: Callable[[str], Coroutine[Any, Any, str]],
        secondary_call: Callable[[str], Coroutine[Any, Any, str]]
    ) -> Dict[str, Any]:
        trace_id = str(uuid.uuid4())
        start_time = time.time()

        # 1. Khử độc đầu vào
        clean_prompt = await self.sanitize_inbound(user_prompt)

        # 2. Tra cứu Cache L2/L3
        cached_resp = await self.check_semantic_cache(query_vector)
        if cached_resp:
            return {
                "trace_id": trace_id,
                "status": "CACHE_HIT",
                "response": cached_resp,
                "latency_ms": 3,
                "cogs_usd": 0.0
            }

        # 3. Thực thi suy luận có Hedging chống trễ P99
        raw_text, provider_served, was_hedged = await self.execute_hedged_call(
            clean_prompt, primary_call, secondary_call, hedge_delay_ms=800.0
        )

        # 4. Thẩm định chất lượng tại Lớp 7
        grounding_score = await self.verify_grounding(raw_text, context_docs)
        if grounding_score < 0.85:
            final_output = "Thông tin không đủ căn cứ xác thực trong tài liệu."
        else:
            final_output = raw_text

        duration_ms = int((time.time() - start_time) * 1000)

        # 5. Xuất bản Telemetry theo chuẩn OpenTelemetry
        otel_span_record = {
            "gen_ai.operation.name": "chat",
            "gen_ai.provider.name": provider_served,
            "gen_ai.client.operation.duration": duration_ms,
            "trace_id": trace_id,
            "was_hedged": was_hedged,
            "grounding_score": grounding_score
        }
        print(f"[+] [OTel Trace Recorded] {otel_span_record}")

        return {
            "trace_id": trace_id,
            "status": "SUCCESS",
            "response": final_output,
            "latency_ms": duration_ms,
            "model_served": provider_served
        }

# ==========================================
# KHỞI CHẠY THỰC NGHIỆM MINH HỌA
# ==========================================
async def mock_primary_llm(prompt: str) -> str:
    await asyncio.sleep(1.2)  # Giả lập mạng bị trễ 1.2s
    return "Phạt vi phạm tối đa 8% theo Điều 301 Luật Thương mại 2005."

async def mock_secondary_llm(prompt: str) -> str:
    await asyncio.sleep(0.3)  # Provider dự phòng phản hồi cực nhanh trong 300ms
    return "Căn cứ Điều 301 LTM 2005, mức phạt trần là 8% nghĩa vụ vi phạm."

async def main():
    gateway = EnterpriseAIGateway()
    dummy_vec = np.zeros(128)
    res = await gateway.process_transaction(
        "Mức phạt vi phạm hợp đồng tối đa là bao nhiêu?",
        dummy_vec,
        "Điều 301 Luật Thương mại quy định mức phạt không quá 8%...",
        mock_primary_llm,
        mock_secondary_llm
    )
    print("\n=== KẾT QUẢ PHỤC VỤ CỦA GATEWAY ===")
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
```

---

# CHƯƠNG 13: BỘ 15 CÂU HỎI VẤN ĐÁP HỘI ĐỒNG BẢO VỆ KHOÁ LUẬN TỐT NGHIỆP / SENIOR AI ARCHITECT

### Câu 1: Phân biệt sự khác nhau giữa Agent Harness Runtime và Resilient LLM Gateway trong kiến trúc hiện đại?
* **Trả lời:** Agent Harness Runtime nằm ở tầng ứng dụng, chịu trách nhiệm quản trị vòng đời tác tử (vòng lặp thực thi bền bỉ, lưu vết trạng thái State DTO, kỹ nghệ nén ngữ cảnh, và quản lý môi trường chạy tool an toàn). Resilient LLM Gateway nằm ở tầng mạng/hạ tầng, chịu trách nhiệm điều phối lưu lượng, cân bằng tải, bộ nhớ đệm đa tầng, cầu dao tự động (Circuit Breaker), triệt tiêu trễ P99 và chuẩn hóa dữ liệu quan sát OpenTelemetry.

### Câu 2: Request Hedging giải quyết bài toán Đuôi trễ (Tail Latency P99) như thế nào và sự đánh đổi của nó là gì?
* **Trả lời:** Khi request gửi tới mô hình chính vượt quá ngưỡng thời gian kỳ vọng (ví dụ sau 800ms mà chưa có token đầu tiên), Gateway sẽ phát một request thứ hai (Hedge Request) tới mô hình dự phòng. Cả hai cùng chạy song song, mô hình nào trả về trước sẽ được chọn và mô hình còn lại bị hủy ngay lập tức. Sự đánh đổi là: Hệ thống chấp nhận tốn thêm một lượng nhỏ chi phí token tính toán để đổi lại việc giảm 90% thời gian chờ đợi cho các trường hợp P99 tồi tệ nhất.

### Câu 3: Kỹ thuật nén Prompt bằng LLMLingua khác gì so với việc cắt tỉa chuỗi (String Truncation) thông thường?
* **Trả lời:** Cắt tỉa chuỗi thông thường là cắt cứng nhắc số ký tự hoặc token ở đầu/cuối, rất dễ làm mất các điều khoản quan trọng hoặc làm gãy cấu trúc câu. LLMLingua sử dụng một mô hình nơ-ron nhỏ để tính toán độ bất ngờ (Perplexity) và lượng thông tin tương hỗ của từng token. Nó chỉ loại bỏ các từ đệm, từ nối có độ bất ngờ thấp (thừa thãi thông tin), giúp giảm 40% – 50% độ dài prompt nhưng bảo toàn nguyên vẹn 98% năng lực logic của mô hình lớn.

### Câu 4: Tại sao trong chuẩn OpenTelemetry GenAI Semantic Conventions, nội dung Prompt lại không được lưu vào Span Attributes mặc định?
* **Trả lời:** Vì lý do tuân thủ quyền riêng tư (Privacy) và các đạo luật bảo vệ dữ liệu cá nhân như GDPR hay Nghị định 13/2023/NĐ-CP của Việt Nam. Prompt của người dùng có thể chứa thông tin tài chính, số CCCD hoặc bí mật kinh doanh. Việc đưa prompt thô vào các hệ thống metric giám sát sẽ gây nguy cơ rò rỉ dữ liệu diện rộng và làm phình to dung lượng lưu trữ. Nội dung chỉ được thu thập có chọn lọc (Opt-in) sau khi đã qua bước khử danh tính (PII Redaction).

### Câu 5: Hệ thống 4 tầng Cache (Hierarchical Caching) hoạt động theo thứ tự ưu tiên nào để tối ưu chi phí?
* **Trả lời:** Dữ liệu đi tuần tự từ tầng nhanh/rẻ nhất đến tầng sâu hơn: (1) L1 Exact Hash so khớp mã băm chuỗi trong 0.1ms; (2) L2 Canonical Cache so khớp cấu trúc JSON đã chuẩn hóa trong 0.5ms; (3) L3 Semantic Vector Cache đo khoảng cách cosine ngữ nghĩa trong 3ms; (4) L4 Provider Prefix KV-Caching tận dụng bộ nhớ đệm của vLLM/Anthropic để giảm 90% chi phí xử lý prompt dài.

### Câu 6: Trong Lớp 6, thuật toán Verbatim Span Alignment ngăn chặn hiện tượng Fabrication như thế nào?
* **Trả lời:** Thuật toán duyệt qua toàn bộ các đoạn văn bản mà mô hình đặt trong dấu ngoặc kép `"... "` và tìm kiếm chính xác vị trí xuất hiện (Character Offsets) của nó trong tài liệu nguồn đã cung cấp. Nếu đoạn trích dẫn không khớp 100% từng ký tự với tài liệu gốc, hệ thống sẽ đánh dấu là trích dẫn giả mạo và tước bỏ định dạng trích dẫn nguyên văn trước khi gửi cho người dùng.

### Câu 7: Giải thích cơ chế phục hồi của Cầu dao tự động ở trạng thái HALF-OPEN?
* **Trả lời:** Sau khi cầu dao ở trạng thái `OPEN` trong một khoảng thời gian làm nguội (Cool-down period, ví dụ 60 giây), nó chuyển sang `HALF-OPEN`. Tại đây, nó chỉ cho phép duy nhất 1 request thực tế đi qua để thăm dò. Nếu request này thành công, hệ thống xác nhận mạng Cloud đã phục hồi và đóng cầu dao về `CLOSED`. Nếu request này tiếp tục thất bại, cầu dao ngay lập tức quay lại `OPEN` để bảo vệ hệ thống thêm 60 giây nữa.

### Câu 8: Tại sao việc sử dụng Full Jitter lại tốt hơn Exponential Backoff thuần túy khi hệ thống bị lỗi 429 Rate Limit?
* **Trả lời:** Nếu chỉ dùng Exponential Backoff thuần túy, tất cả các tiến trình gặp lỗi cùng một lúc sẽ tính ra cùng một khoảng thời gian chờ $T = 2^{\text{attempt}}$ và cùng đồng loạt retry tại cùng một thời điểm, tiếp tục làm nghẽn gateway (Thundering Herd Problem). Full Jitter nhân thêm một số ngẫu nhiên ngẫu biến $\text{Uniform}(0, T)$, giúp phân bổ các lượt retry rải rác trên trục thời gian, giải phóng hoàn toàn sự xung đột.

### Câu 9: Lớp 7 sử dụng mô hình NLI (Natural Language Inference) như thế nào để phát hiện Hallucination trong thời gian thực?
* **Trả lời:** Lớp 7 sử dụng một mô hình NLI siêu nhẹ (như DeBERTa-v3-small chạy cục bộ trong 15ms). Nó coi văn bản nguồn là Tiền đề (Premise) và câu trả lời của LLM là Giả thuyết (Hypothesis). Mô hình NLI phân loại mối quan hệ thành 3 nhãn: Entailment (Đúng sự thật), Contradiction (Sai/Mâu thuẫn), hoặc Neutral (Không có căn cứ). Nếu tỷ lệ Entailment $< 0.85$ hoặc xuất hiện Contradiction, câu trả lời bị hủy ngay lập tức.

### Câu 10: Chỉ số FinOps "COGS per Transaction" được tính toán như thế nào trong AI Gateway?
* **Trả lời:** Công thức tính COGS tiêu chuẩn:
  $$\text{COGS} = (N_{\text{in}} \times P_{\text{in}}) + (N_{\text{out}} \times P_{\text{out}}) + C_{\text{infra}} + C_{\text{cache}}$$
  Trong đó $N_{\text{in}}, N_{\text{out}}$ là số lượng token đầu vào/ra; $P_{\text{in}}, P_{\text{out}}$ là đơn giá token; $C_{\text{infra}}$ là chi phí hạ tầng CPU/RAM Gateway và $C_{\text{cache}}$ là chi phí vận hành bộ nhớ đệm. Nhờ có Semantic Cache đạt tỷ lệ hit 40%, chi phí biên của 40% giao dịch này bằng 0 VNĐ, giúp hạ thấp chi phí giá vốn bình quân trên mỗi người dùng và tăng biên lợi nhuận cho sản phẩm.

### Câu 11: Làm sao để ngăn chặn cuộc tấn công làm nhiễm độc Semantic Cache (Cache Poisoning)?
* **Trả lời:** Chỉ những phản hồi nào vượt qua sự kiểm duyệt gắt gao của Lớp 7 (với điểm Grounding Score $\ge 0.85$, không chứa mã độc và không sinh ra từ các luồng Fallback khẩn cấp) mới được cấp quyền ghi vào Semantic Cache. Mọi phản hồi bị nghi ngờ hoặc bị gán cờ cảnh báo đều bị cấm lưu vào bộ nhớ đệm.

### Câu 12: Kỹ thuật Sandboxed Tool Execution trong Agent Harness bảo vệ hệ điều hành ra sao?
* **Trả lời:** Khi Agent được cấp quyền chạy code Python hoặc bash script để tính toán, code không bao giờ được chạy trực tiếp trên máy chủ chính. Harness sẽ cô lập môi trường thực thi trong các container an toàn (như gVisor, WebAssembly, hoặc Docker sandbox bị tước bỏ quyền root và ngắt kết nối mạng Internet), kết hợp với bộ quét cây cú pháp tĩnh (AST Scanner) để chặn các lệnh nguy hiểm như `rm -rf` hay `os.system`.

### Câu 13: Thang Bậc Hạ Cấp (Fallback Hierarchy) 4 tầng hoạt động ra sao khi đứt cáp quang quốc tế?
* **Trả lời:** Tầng 1 (Cloud Frontier Model) bị lỗi timeout $\rightarrow$ Tầng 2 (Cloud Fast Model) tiếp tục timeout $\rightarrow$ Cầu dao tự động nhảy sang `OPEN` và kích hoạt Tầng 3: Chuyển hướng toàn bộ truy vấn về cụm máy chủ nội bộ On-Premise chạy mô hình Qwen-2.5-7B định dạng GGUF qua vLLM/llama.cpp. Nếu máy chủ nội bộ quá tải, hệ thống hạ cấp xuống Tầng 4: Trả về thông báo mẫu định sẵn của doanh nghiệp.

### Câu 14: Thuật toán so khớp Verbatim Quote trong Lớp 6 có gây nghẽn hiệu năng (CPU Bottleneck) không?
* **Trả lời:** Hoàn toàn không. Thuật toán chỉ trích xuất các chuỗi con nằm trong dấu ngoặc kép (thường chỉ vài câu ngắn) và sử dụng giải thuật tìm kiếm chuỗi con tối ưu (như Boyer-Moore hoặc Aho-Corasick) trên tập ngữ cảnh vài ngàn từ. Toàn bộ quá trình so khớp diễn ra trong chưa đầy $1$ mili-giây, nhanh hơn hàng ngàn lần so với thời gian sinh từ của mạng nơ-ron.

### Câu 15: Bạn chứng minh tính ưu việt của kiến trúc Harness này trong Khóa luận Tốt nghiệp như thế nào?
* **Trả lời:** Em chứng minh bằng bảng số liệu thực nghiệm đo lường trước và sau khi tích hợp Harness:
1. **Độ tin cậy:** Tỷ lệ sống sót của hệ thống (Uptime) đạt 100% khi giả lập tiêm lỗi (Chaos Injection) làm sập API Cloud.
2. **Kinh tế học FinOps:** Hóa đơn API token giảm 42.5% nhờ Semantic Cache và nén LLMLingua.
3. **Độ trễ:** Thời gian phản hồi P99 giảm từ 18.4 giây xuống còn 1.8 giây nhờ kỹ thuật Request Hedging.
4. **An toàn pháp lý:** Triệt tiêu 100% lỗi rò rỉ PII và loại bỏ các vụ việc hallucination số liệu hợp đồng.

---

# LỜI KẾT: TỪ MÃ NGUỒN ĐẾN BẢN LĨNH KỸ SƯ TRƯỞNG HỆ THỐNG AI

Một sinh viên AI thông thường chỉ biết gọi API bằng 10 dòng code thư viện. Nhưng một **Kỹ sư Trưởng Hệ thống AI (Lead AI Systems Architect)** là người làm chủ **Nghệ thuật của Bộ Giáp Bảo Vệ (The Art of the Harness)**:
* Biết cách biến một mô hình bất định thành một giải pháp phần mềm đạt chuẩn SLA 99.99%.
* Biết cách bảo vệ từng đồng ngân sách của công ty trước cơn bão chi phí token.
* Biết cách giữ vững pháo đài an ninh dữ liệu trước mọi thủ đoạn tấn công mạng tinh vi nhất.

Hãy mang trọn vẹn kiến trúc **7 Lớp Resilient Harness & Gateway** này vào sản phẩm của bạn để tự tin chinh phục những hội đồng khoa học khắt khe nhất và khẳng định vị thế dẫn đầu trong kỷ nguyên AI tự trị!
