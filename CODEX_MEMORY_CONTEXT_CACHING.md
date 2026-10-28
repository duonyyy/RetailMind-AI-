# ĐẶC TẢ CHO CODEX — Memory, Context Engineering & Prompt Caching cho AI Agent

> **Mục đích:** Biến kiến thức của bài *Memory, Context Engineering & Prompt Caching* thành nhiệm vụ lập trình có thể thực thi, đo lường và kiểm thử. Đây là **tài liệu tổng hợp và đề xuất triển khai**, không phải bản chép nguyên văn slide.
>
> **Nguồn chính:** https://pub.nndkhoa9.win/agentic-ai-engineering/d07-mem-context-caching/
>
> **Đối tượng:** Codex hoặc coding agent làm việc trong một repository hiện có; cũng có thể dùng để xây demo độc lập nếu repository trống.
>
> **Quy ước:** `MUST` = bắt buộc; `SHOULD` = nên có; `MAY` = mở rộng. Những ngưỡng, tên file, giao diện và stack bên dưới là **đề xuất kỹ thuật** nhằm biến kiến thức thành sản phẩm; không phải quy định nguyên văn của nguồn.

---

## 0. HƯỚNG DẪN THỰC THI DÀNH CHO CODEX

Bạn là coding agent chịu trách nhiệm **thiết kế, cài đặt, kiểm thử và báo cáo** một module quản lý memory, context và prompt caching cho AI Agent.

1. **Khảo sát repo trước:** đọc `README`, `AGENTS.md`, `package.json` / `pyproject.toml`, cấu trúc source, test, agent loop hiện tại, API client và logging. Không giả định dự án đang dùng framework hoặc provider nào.
2. **Ưu tiên tích hợp:** giữ ngôn ngữ, dependency và coding style có sẵn. Nếu repo trống, mặc định **TypeScript + Node.js + SQLite + Vitest**, chạy local, không yêu cầu API key để thực hiện test.
3. **Phân biệt ba luồng:** (a) persistent memory lưu qua session; (b) working context dùng trong một request; (c) prompt caching do provider thực hiện. Không dùng từ “cache” để thay thế cho memory.
4. **Cài đặt theo thứ tự:** Memory → Context Builder/Compaction → Prompt Cache Observability/Optimizer → Demo/Benchmark. Mỗi giai đoạn phải có test, không để implementation cuối cùng chỉ là tài liệu.
5. **Không thay chính sách bằng memory:** `AGENTS.md`, system/developer instructions và quyền truy cập luôn cao hơn ghi nhớ tự sinh. Không tự sửa `AGENTS.md` trừ khi task hoặc chủ repo cho phép.
6. **Không thực thi code LLM sinh ra trong process chính:** Code Mode, nếu được triển khai, phải có sandbox thực sự, quyền giới hạn, timeout và resource limits. Khi chưa có sandbox, chỉ cài **safe batch-tool execution** bằng code/operation do developer định nghĩa sẵn.
7. **Không bịa chỉ số:** token cache-hit, phí token, TTL, context window và tên trường usage phải được lấy từ provider thực tế hoặc test fixture. Phân biệt số ước lượng với số API đo được.
8. **Cuối cùng:** chạy lint/typecheck/test/demo phù hợp với repo; đưa bảng kết quả, file đã sửa, hạn chế còn lại và các lệnh tái hiện. Nếu thiếu API key, các test unit/integration bằng fake provider MUST vẫn chạy được.

### Kết quả bàn giao

- Source code hoạt động, adapter cho agent loop hoặc harness hiện hữu.
- Migration/schema và tài liệu cấu hình; không commit secrets hoặc database chứa dữ liệu riêng.
- Test cho các tình huống A/B/C ở mục 11; test bảo mật và lifecycle.
- `README` hướng dẫn cách chạy và một báo cáo benchmark trước/sau (`docs/agent-context-benchmark.md` hoặc đường dẫn tương đương).
- CLI hoặc demo có thể chạy cục bộ để kiểm tra `memory`, `compact`, `cache decision`.

## 1. MỤC TIÊU & RANH GIỚI

### 1.1 Ba vấn đề cần giải

| Vấn đề | Câu hỏi | Cơ chế |
|---|---|---|
| **Remember** | Bắt đầu session mới, agent còn nhớ thông tin quan trọng gì? | Persistent Memory + Retrieval + Injection |
| **Manage** | Sau nhiều message/tool call, request LLM phải mang dữ liệu nào? | Context Builder + Pruning + Compaction/Checkpoint + Code Mode |
| **Reuse** | Phần prefix của prompt lặp lại qua request được tái sử dụng ra sao? | Provider Prompt Caching + Prompt Layout + Usage/Cost Monitoring |

**Nguyên tắc lõi:** LLM không có trí nhớ bền vững tự thân giữa các API request độc lập; **harness** chịu trách nhiệm lưu, lấy, nạp dữ liệu và xây context cho từng lượt gọi.

### 1.2 Định nghĩa không được đánh đồng

- **State:** trạng thái tiến độ chạy, ví dụ `running_tests`, `waiting_for_approval`, bước tiếp theo.
- **History:** chuỗi messages, tool calls và tool outputs; không phải mọi thứ đều cần tái nạp.
- **Memory:** thông tin được tuyển chọn có ích ở phiên sau (quy ước, quyết định, lỗi đã thử, bài học).
- **Instructions/Policies:** luật có độ ưu tiên cao, từ người dùng và dự án; **không** được ghi đè bởi memory.
- **Context:** nội dung thực tế được gửi tới LLM của **một lần gọi**.
- **Prompt cache:** trạng thái prefill của **provider**, chỉ tái sử dụng khi điều kiện và prefix khớp; cache token **vẫn chiếm context window**.
- **Response cache:** cache toàn bộ đầu ra khi key trùng, khác hẳn prompt cache vì prompt cache **vẫn chạy inference tạo đầu ra mới**.

### 1.3 Những gì nằm ngoài phạm vi MVP

- Không cần vector database hay embedding cho kho memory nhỏ. Bắt đầu bằng structured metadata + keyword/topic search; chỉ bổ sung semantic search nếu benchmark chứng minh lợi ích.
- Không implement một custom KV cache ở phía ứng dụng; prompt caching do LLM provider quản lý.
- Không chạy keep-alive mặc định. Chi phí, TTL, lợi ích và chính sách provider phải được kiểm chứng trước khi bật.
- Không xây một autonomous agent mới nếu repo đã có agent loop.
- Không tự quyết định giữ thông tin nhạy cảm, API keys, mật khẩu, nội dung bí mật từ log.

## 2. KIẾN TRÚC THAM CHIẾU

```text
User Request
     │
     ▼
┌────────────────────────────── Agent Harness ───────────────────────────────┐
│                                                                            │
│  Agent State Store ──────────────┐                                         │
│  Persistent Memory Store ────────┼─► Context Builder ─► LLM Provider        │
│  Project/User Instructions ──────┤         ▲                │              │
│  Session History ────────────────┘         │                ▼              │
│                           Compactor/Checkpoint ◄─ Agent Loop/Tool Results │
│                                        │                  │                │
│                         Log Archive / Artifact Store ◄───┘                │
│                                                                            │
│  Token Budget Monitor  ──► Compaction Trigger                              │
│  Provider Usage Adapter ──► Cache Metrics ─► Cost/Strategy Planner         │
│  Permission Gateway ────► Tools / Optional Sandboxed Code Runtime          │
└────────────────────────────────────────────────────────────────────────────┘
```

### Thành phần và hợp đồng

| Module | Trách nhiệm | API nội bộ đề xuất |
|---|---|---|
| `MemoryStore` | CRUD, lifecycle, provenance, scope, supersession | `upsert`, `retrieve`, `supersede`, `forget`, `expire` |
| `MemoryRetriever` | Chọn ghi nhớ theo task, budget, độ tin cậy | `search(query, scopes, limit)` |
| `AgentStateStore` | Lưu tiến độ, checkpoints, idempotency | `loadSession`, `saveSession`, `saveCheckpoint` |
| `ContextBuilder` | Compose instructions + memory + history + task trong token budget | `buildContext(input)` |
| `TokenBudgetMonitor` | Đo/ước lượng prompt và output reserve | `measure`, `shouldCompact` |
| `Compactor` | Prune, selective keep/truncate/drop, schema checkpoint | `compact(session)` |
| `ToolRuntime` | Chạy tools theo quyền và chỉ đưa findings cần thiết vào context | `execute`, `batchAnalyze` |
| `ProviderAdapter` | LLM calls, normalized usage, features và limits | `generate`, `getCapabilities` |
| `CacheCostPlanner` | Ước tính cost warm/compact/switch và keep-alive | `compareStrategies` |
| `Telemetry` | Metrics, trace IDs, audit không lộ bí mật | `recordUsage`, `recordCompaction` |

**Luồng request bắt buộc:**

1. Load instructions/policies, session state, history hoặc checkpoint.
2. Retrieve memory phù hợp theo user/project/task; loại bản cũ/superseded/expired/forgotten.
3. Build prompt theo thứ tự ổn định và đúng priority; tính budget và chừa output reserve.
4. Nếu vượt ngưỡng: prune output dư → compact có schema → **nạp lại** rules/skills/plan → kiểm tra context.
5. Gọi provider; ghi nhận usage và cached tokens thực tế khi provider hỗ trợ.
6. Chạy tool qua permission gateway, archive raw output khi lớn, chỉ giữ structured findings.
7. Cập nhật state; persist các memory được xác nhận/đủ điều kiện; lặp lại nếu agent tiếp tục.

## 3. PERSISTENT MEMORY — GHI NHỚ XUYÊN SESSION

### 3.1 Phân loại & phạm vi

- `session`: thông tin ngắn hạn, ví dụ test hiện tại đang fail. Có thể tồn tại trong checkpoint/state; không nhất thiết là persistent memory.
- `project`: quyết định kỹ thuật và convention, ví dụ dự án dùng PostgreSQL hoặc authentication bằng session cookie.
- `user`: sở thích hợp lệ trong phạm vi được phép lưu và có khả năng dùng lại.
- `instructions`: file quy tắc như `AGENTS.md`; **không** được pha vào kho memory tự sinh như một loại memory thấp hơn.

Mỗi memory có thể gắn `topic`, `scope`, `status`, `provenance`, ngày hiệu lực, hạn dùng và dấu vết thay thế.

### 3.2 Đề xuất schema

```ts
type MemoryStatus = 'active' | 'superseded' | 'expired' | 'forgotten';
type MemoryKind = 'decision' | 'convention' | 'preference' | 'lesson' | 'fact';
type MemoryScope = 'project' | 'user';

interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  scopeId: string;                // định danh project/user, dùng để ngăn rò rỉ chéo scope
  topic: string;                  // ví dụ "auth", "typescript", "deployment"
  key: string;                    // ví dụ "authentication_strategy"
  value: string;
  kind: MemoryKind;
  status: MemoryStatus;
  sourceRef: string;              // quyết định/commit/session/message được kiểm chứng
  confidence?: number;           // 0..1; không xem thông tin suy diễn là policy
  effectiveAt: string;           // ISO 8601
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  supersedesId?: string | null;
  reason?: string | null;
}
```

Ràng buộc khi lưu bằng SQLite (hoặc ORM của repo):

- Unique/lookup index theo `(scope, scopeId, topic, key, status)` nếu phù hợp; lưu lịch sử thay đổi, tránh overwrite mất provenance.
- `upsert` và `supersede` chạy transaction; **mỗi `(scope, scopeId, key)` chỉ có một quyết định hiện hành** khi khóa mang tính độc nhất.
- Không truy vấn vượt project/user scope; chuẩn hóa timezone UTC, có migration.
- Xóa/forget thực sự theo yêu cầu: bản quên **không xuất hiện trong retrieval**, kể cả index hoặc bản tóm tắt; có thể cần purge dữ liệu thô theo retention/privacy policy của repo. Audit tối thiểu, không lưu lại nội dung bị yêu cầu xóa.

### 3.3 Lifecycle bắt buộc

`Observe → Decide to remember → Write → Store/Index → Retrieve → Use → Update/Supersede/Forget/Expire`

**Write policy:** chỉ ghi điều có tính bền, có căn cứ, có khả năng tái sử dụng. Không ghi mọi chat hoặc mọi tool output. Gợi ý cho phép manual confirmation với quyết định quan trọng; không dùng memory để ghi secrets.

**Retrieve policy:**

- Nhận `task`, scope cho phép, `maxMemories`, `tokenBudget`.
- Chỉ trả `active`, chưa hết hạn, đúng scope; xếp hạng topic/key match, độ mới, nguồn tin cậy.
- Không tự động chèn mọi memory ở mỗi lượt. Ưu tiên index ngắn + topic files / lọc theo task (**progressive disclosure**).
- Gắn nguồn và tình trạng rõ ràng để model không nhầm nội dung memory với system instruction; xem retrieved content là dữ liệu, không là mệnh lệnh.

**Update policy:** tạo bản mới và đặt bản cũ là `superseded`; giữ lý do và `sourceRef`. Khi quy ước thay đổi, session mới chỉ nhận bản active.

**Forget/Expire policy:** chủ động loại khỏi index, retrieval và injection; kiểm thử dữ liệu đã quên không còn được phục hồi qua đường cache ứng dụng. TTL tùy loại memory, không giả định mọi quy ước tự hết hạn.

### 3.4 Progressive disclosure qua file (tùy nhu cầu)

```text
AGENTS.md                        # instructions của repo: ưu tiên cao, quản lý độc lập
.agent/
  MEMORY.md                      # index rất ngắn: chủ đề + chỉ dẫn file
  memory/
    auth.md                      # chi tiết chỉ load khi task liên quan auth
    conventions.md
    lessons.md
  state/                         # session/checkpoint hoặc DB tương đương
  archives/                      # log lớn, không inject toàn bộ
```

Nếu DB là nguồn sự thật (`source of truth`), các file topic/index chỉ là view được sinh lại; không duy trì 2 nguồn sự thật có thể mâu thuẫn. Nếu repo nhỏ, có thể dùng file Markdown/JSON làm store chính và không thêm SQLite; cần đảm bảo ghi atomically, versioning, search và lifecycle.

### 3.5 Test tình huống JWT → session cookie

1. Session 1 lưu `authentication_strategy = JWT` từ một quyết định hợp lệ.
2. Kết thúc session; khởi tạo session 2 **không mang history session 1**. Task liên quan authentication phải retrieve và dùng `JWT`.
3. Trong session 2, nhận quyết định mới có provenance: `authentication_strategy = session_cookie`; gọi `supersede`.
4. Session 3 khởi tạo sạch: **chỉ nạp `session_cookie`** như quy ước đang hiệu lực; JWT không được cạnh tranh trong active context.
5. Chức năng audit có thể hiển thị JWT là `superseded` kèm thời gian/lý do (không inject mặc định).
6. Log demo phải chỉ rõ danh sách `memory_ids` được inject, tránh trường hợp agent trả đúng do đoán.

**Điều kiện đạt:** kết quả xuyên session chính xác; cập nhật không làm mất provenance; memory lỗi thời không còn được inject.

## 4. CONTEXT ENGINEERING — WORKING SET THEO TỪNG REQUEST

### 4.1 Context không phải kho lưu trữ

Context cho một lần LLM call chỉ nên chứa:

1. System/developer/project instructions và những skills bắt buộc.
2. Mục tiêu, constraints và trạng thái quan trọng của task hiện tại.
3. Memory được retrieve có liên quan.
4. History gần đây cần cho bước kế tiếp / structured checkpoint.
5. Kết quả tool đã rút gọn và yêu cầu mới nhất.

Phải **chừa chỗ cho output, tool calls, safety margin**. Log, file dài, stack trace và artifact thô nên đặt ở archive rồi dùng đường dẫn để đọc lại có chọn lọc.

### 4.2 Token budget đề xuất

```ts
interface ContextBudget {
  modelContextWindow: number;      // tra theo provider/model thực tế
  reservedOutputTokens: number;    // > 0, cấu hình theo task
  safetyMarginTokens: number;      // > 0 để tránh overflow do estimate sai
  compactionTriggerRatio: number;  // ví dụ 0.75 của phần input cho phép (configurable)
}

const maxInputTokens =
  modelContextWindow - reservedOutputTokens - safetyMarginTokens;
```

- Đếm token bằng tokenizer phù hợp nếu có; fallback là estimate được gắn nhãn (không coi là provider usage).
- Trigger trước khi đầy context. Ngoài ngưỡng token còn có trigger theo sự kiện: tool output lặp, hoàn thành milestone, chuẩn bị nạp dữ liệu lớn.
- Cấm cắt bỏ high-priority instructions / constraints vì vượt budget. Nếu không thể fit, trả lỗi an toàn hoặc yêu cầu phân đoạn task thay vì gửi prompt lỗi.
- Cache **không** làm tăng `modelContextWindow` hoặc `maxInputTokens`.

### 4.3 Chính sách KEEP / TRUNCATE / DROP

| Nhãn | Nội dung | Ví dụ |
|---|---|---|
| `KEEP` | Cần chính xác nguyên văn để tiếp tục | yêu cầu bắt buộc, quyết định hiện hành, lỗi chưa xử lý, tool argument cần thiết |
| `TRUNCATE` | Có thể rút gọn, giữ kết luận và locator | log test 10.000 dòng → 3 lỗi, file, snippet và archive path |
| `DROP` | Trùng lặp, hết tác dụng hoặc có thể tái tạo | progress spam, log thành công lặp, output cũ đã kết luận |

Default phải **bảo thủ**: không chắc an toàn thì KEEP hoặc TRUNCATE; không DROP thông tin quan trọng. Bắt đầu bằng rule-based classifier có test; model phụ trợ chỉ thêm khi có cơ chế validate.

### 4.4 Checkpoint có cấu trúc, không phải recap văn xuôi

```ts
interface AgentCheckpoint {
  schemaVersion: 1;
  sessionId: string;
  goal: string;
  currentState: string;
  constraints: string[];
  decisions: Array<{ key: string; value: string; sourceRef?: string }>;
  findings: Array<{ summary: string; evidenceRefs: string[] }>;
  failedAttempts: Array<{ attempt: string; whyFailed: string; evidenceRefs: string[] }>;
  openIssues: string[];
  files: Array<{ path: string; relevance: string }>;
  artifactRefs: string[];
  completedSteps: string[];
  nextAction: string;
  updatedAt: string;
}
```

**Yêu cầu:** checkpoint hợp schema, không bịa file/đường dẫn, có `nextAction`, lưu đầy đủ constraints / failed attempts quan trọng. Các `evidenceRefs` phải dẫn đến artifact tồn tại hoặc ID đã ghi nhận. Nếu một trường quan trọng không thể xác minh, đánh dấu chưa rõ thay vì tạo dữ kiện.

### 4.5 Controlled reboot — thuật toán compaction

```text
INPUT: active_context, session_state, token_budget
1. Observe measured/estimated token budget.
2. Archive raw outputs if needed; prune duplicate/oversized tool results.
3. Classify chunks: KEEP / TRUNCATE / DROP with high-priority rules.
4. Build checkpoint against strict schema; validate required fields and evidence refs.
5. Atomically persist checkpoint and artifact references.
6. Rebuild context from authoritative instructions + skills + selected memory + checkpoint
   + newest user task (do not rely on a possibly truncated old prompt).
7. Recalculate budget and integrity-check: goal, constraints, open issues, failed attempts,
   next action, permissions, source refs.
8. Resume; assert the very next action follows checkpoint.
OUTPUT: reduced context + compaction metrics + continuity check
```

**Không thay toàn bộ history bằng summary tự do**. Không để checkpoint cũ chồng nhiều tầng summary gây tích lũy sai lệch. Nếu checkpoint lỗi schema hoặc mất constraints, dừng compaction, fallback an toàn (giữ source, reduce raw outputs, retry với giới hạn) thay vì tiếp tục thiếu thông tin.

### 4.6 Test context dài

- Tạo test fixture giả lập history dài và tool log lớn (không cần LLM thật).
- Chèn cụ thể: goal, constraints, `3 failing tests`, 2 cách sửa đã thất bại, file liên quan, next action.
- Trigger compaction bằng budget thấp có kiểm soát.
- Khẳng định context sau compact nhỏ hơn trước; schema hợp lệ; 100% các facts quan trọng còn; log thô không còn trong active context nhưng có thể truy xuất từ artifact.
- Rehydrate session từ checkpoint và kiểm tra next action không lặp lại 2 failed attempts.
- Nếu provider cho token usage, đo request input tokens trước/sau; nếu mock thì ghi rõ đây là estimated tokens.

## 5. CODE MODE / TOOL-OUTPUT MINIMIZATION

### 5.1 Ý tưởng

**Compaction** rút gọn dữ liệu **sau khi** dữ liệu đã tới context. **Code Mode** (hay safe batch tool execution) lọc/tổng hợp dữ liệu **trước khi** gửi về LLM. Hai chiến lược bổ sung nhau.

**Native tool calling**: agent hỏi đọc từng file → output thô về LLM → agent hỏi file tiếp theo.

**Batch analysis**: agent gọi một operation tổng hợp → runtime tự đọc/lọc/đếm nhiều file → LLM nhận findings ngắn gọn.

### 5.2 MVP khuyến nghị (không thực thi code tùy ý)

Cài **tool có input được kiểm tra schema**, ví dụ:

```ts
interface AnalyzeLogsInput {
  paths: string[];
  pattern: string;
  topK: number;
}
interface AnalyzeLogsOutput {
  totalFiles: number;
  totalMatches: number;
  topFiles: Array<{ path: string; matches: number }>;
  artifactRef?: string;
  truncated: boolean;
}
```

- Runtime đọc file từ allowlisted workspace; áp `maxFiles`, `maxBytes`, `maxDuration`, `topK` và glob/path validation.
- Không đọc ra ngoài workspace bằng symlink/path traversal.
- Không in raw log ra prompt hoặc stdout trả về LLM. Chỉ trả summary/aggregates và locator khi cần.
- Lưu bản log gốc trong archive có quota/retention và access control phù hợp; sanitize secret/PII trong phần trả về.
- Tool có trace ID để debug và không làm mất bằng chứng.

### 5.3 Tùy chọn nâng cao: `run_code(code)`

Chỉ implement nếu repo đã có hoặc có thể cung cấp **sandbox đúng nghĩa**:

- Cô lập hệ thống file/network/process; không cấp credential mặc định.
- Tất cả tool proxy áp permission policy, scope, rate limiting, timeouts, quota.
- Resource limits cho CPU/memory/disk, giới hạn thời gian và output size.
- Có audit, giới hạn side effects, xác thực approval cho hành động nguy hiểm.
- **Worker thread hoặc child process đơn thuần không được coi là sandbox bảo mật.**
- Các hàm `tools.*` phải được mô tả cho model qua capability discovery; đây là API **do harness định nghĩa**, không phải API chuẩn phổ quát.

### 5.4 Test Code Mode

- Fixture 100 file, phân bố số `TODO` đã biết.
- Agent nhận đúng 5 file có nhiều TODO nhất và tổng số match.
- Active context/tool result chỉ chứa top 5 + thống kê, không chứa nội dung 100 file.
- Test path traversal, symlink escape, output size, timeout, permission denied.
- So sánh input tokens / ký tự tool result với native tool call baseline; bảo đảm kết quả nghiệp vụ không thay đổi.

## 6. PROMPT CACHING — THIẾT KẾ PREFIX ỔN ĐỊNH

### 6.1 Nguyên lý

Với provider hỗ trợ cache, **prefix đầu vào giống nhau** có thể sử dụng lại trạng thái prefill (KV) theo quy tắc của provider. Model **vẫn tạo output mới**. Cache hit có thể giảm phí input và/hoặc latency; không tiết kiệm context window.

**Prefix ổn định (đề xuất):**

```text
[stable system/developer instructions]
[stable tool declarations: order and definitions unchanged]
[stable project instructions / skills]
[append-only conversation history while still using the same prefix]
[volatile task data / latest user message / timestamps at the end]
```

> Thứ tự segment thực tế phụ thuộc API/provider và hierarchy của messages. Phải giữ nguyên cấu trúc role/tool declaration do SDK yêu cầu; không thay đổi priority chỉ để cache hit.

### 6.2 Quy tắc bắt buộc

- Không đưa timestamp, request ID, random nonce hoặc trạng thái động vào **đầu** prefix nếu không cần.
- Đảm bảo serialization ổn định của instructions và tool definitions (thứ tự, whitespace và schema khi provider nhạy với chúng).
- Trong session không compact, ưu tiên append lịch sử thay vì sửa message cũ; khi có quyết định đổi hoặc cần compact, **tính đúng đắn được ưu tiên hơn cache hit**.
- Mỗi request thu thập `inputTokens`, `cachedInputTokens` nếu provider trả về, `outputTokens`, latency và ước tính chi phí.
- Cache scope, eligibility, TTL, thresholds, cache write fees và cache-read fees là thuộc tính **theo provider/model**; không hard-code “TTL = 5 phút” hoặc assume lúc nào cũng hit.
- Không lấy KV cache của model A dùng cho model B; chuyển model có thể làm lạnh cache.
- Ghi `cacheHitRatio = cachedInputTokens / inputTokens` khi `inputTokens > 0`; nếu không có usage, để `unknown`, không mặc định bằng 0.

### 6.3 Provider usage normalization

```ts
interface NormalizedLLMUsage {
  provider: string;
  model: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  cacheWriteInputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number | null;
  source: 'provider' | 'estimate' | 'mock';
}

interface ProviderCapabilities {
  contextWindow: number;
  promptCaching: boolean;
  cacheTtlSeconds?: number;       // only if documented or configured explicitly
  supportsCacheWritePricing: boolean;
  tokenizer?: string;
}
```

Map fields theo SDK version đang dùng và **unit-test adapter với fixtures**. Ví dụ có provider biểu diễn cache đọc trong `usage...cached_tokens`, provider khác có `cache_read_input_tokens`; các trường này là ví dụ về dữ liệu khả dụng, không phải schema chung của mọi SDK. Có thể có provider tính riêng cache creation/write.

### 6.4 Cost model (đơn vị: USD / 1 triệu tokens)

Đặt:

- `I` = input tokens không được cache; `R` = cached read input tokens; `W` = cache write tokens nếu provider tính riêng; `O` = output tokens.
- `pIn`, `pRead`, `pWrite`, `pOut` = đơn giá tương ứng trên 1 triệu tokens.
- `pWrite` phải theo semantics của provider: **không cộng đúp** phí input của cache-write tokens nếu biểu giá cache-write đã thay thế giá input thường.

Nếu provider phân loại input thành các nhóm **không chồng lặp** `I`, `R`, `W` thì:

```text
cost = (I*pIn + R*pRead + W*pWrite + O*pOut) / 1_000_000
```

Nếu provider chỉ xuất tổng `inputTokens`, trong đó `R` nằm trong tổng và không có loại write riêng, quy đổi `I = inputTokens - R` trước khi tính. Nếu cache write được tính theo cơ chế khác, implement pricing adapter riêng. Không suy đoán số liệu thiếu.

**Ví dụ giả định trong bài học (không phải giá niêm yết của nhà cung cấp):**

| Model | Input thường | Cached input | Output |
|---|---:|---:|---:|
| A | $5 / 1M | $0.5 / 1M | $20 / 1M |
| B | $1 / 1M | không có cache warm | $5 / 1M |

Tình huống: `50.000` tokens prefix đã cache ở A, `2.000` input mới, `1.000` output.

```text
Model A warm = 50_000*0.5/1M + 2_000*5/1M + 1_000*20/1M
             = $0.025 + $0.010 + $0.020 = $0.055
Model B cold = 52_000*1/1M + 1_000*5/1M
             = $0.052 + $0.005 = $0.057
```

**Kết luận:** model có giá input thường cao hơn vẫn có thể rẻ hơn **trên request tiếp theo** nhờ cache warm. Khoản tiết kiệm ở ví dụ chỉ $0.002, không thể dùng để kết luận keep-alive nhiều lần luôn có lợi.

### 6.5 Warm vs Compact vs Switch

Ba lựa chọn:

- **Warm:** giữ model hiện tại với cache hot; có thể phát sinh phí keep-alive; nếu cache cold thì thay bằng cold-cost, không giả định hit.
- **Compact:** giảm context còn checkpoint và phần cần thiết; mất hoặc giảm prefix hit sau khi history bị viết lại; thêm chi phí compaction.
- **Switch:** chọn model khác có giá thấp hơn hay hiệu quả hơn nhưng thường không mang theo cache prefill của model cũ; kiểm tra chất lượng/latency.

`CostPlanner` MUST so sánh theo cùng task/output requirement và ràng buộc context. Pseudocode:

```text
costWarm = price(modelA, cachedTokensA, freshInputA, outputA)
costCompact = costCompaction + price(targetModel, compactedInputCold, outputEstimate)
costSwitch = price(modelB, fullInputCold, outputEstimate)

feasible(strategy) = fitsContextWindow && meetsQualityFloor && meetsLatencySLO
choose argmin(expectedCost(strategy)) among feasible strategies
```

**Keep-alive break-even (baseline):**

```text
expectedSavings = P(nextRequest) * (costColdNext - costWarmNext)
keepAliveWorthTrying = expectedSavings > SUM(costKeepAliveRequests)
```

Hệ thống thực tế phải tính thêm retry, TTL expiry, xác suất cache hit thực, điều kiện gia hạn cache, cache write pricing, latency, chất lượng, chi phí compaction và khả năng không có request tiếp theo.

**Quan trọng về thời điểm compact:** nếu compact chủ động ngay từ bây giờ, phí compact phát sinh dù user không quay lại; nếu chỉ compact khi user quay lại, phí compact được nhân với `P(nextRequest)` trong expected cost. Chọn một mô hình và tài liệu hóa rõ; không tráo hai cách trong một phép so sánh.

### 6.6 Cấu hình đề xuất

```yaml
agent:
  context:
    compaction_trigger_ratio: 0.75  # ví dụ, tùy model/metrics; không phải giá trị cố định từ nguồn
    reserved_output_tokens: 4096
    safety_margin_tokens: 1024
  memory:
    max_retrieved_items: 12
    max_injected_tokens: 2000
    require_provenance: true
  cache:
    observe_enabled: true
    keep_alive_enabled: false      # chỉ bật sau khi có policy + benchmark thực tế
    pricing_source: configured    # giá do operator cập nhật, không hard-code bừa
  tools:
    allow_arbitrary_code: false
    max_batch_files: 100
    max_result_bytes: 16000
    timeout_ms: 30000
```

Mọi ngưỡng trong block trên đều có thể override và nên có kiểm tra hợp lệ. Token reserve không thể lớn hơn context window. `max_result_bytes` áp cho output gửi LLM, không thay thế quota archive.

## 7. CHIẾN LƯỢC CHO SESSION DÀI

### 7.1 Vì sao lịch sử tăng chi phí

Nếu turn đầu có `B` tokens và mỗi turn thêm `d` tokens, input của lượt `n` gần đúng:

```text
input(n) = B + (n-1)*d
sumInput(N) = N*B + d*N*(N-1)/2
```

Tổng input tokens qua N request có thể tăng **bậc hai** khi history tích lũy liên tục; **input của từng request** vẫn chỉ tăng tuyến tính. Cache có thể giảm chi phí prefill phần lặp nhưng **không ngăn context đầy**. Do đó vẫn cần pruning, checkpoint và budget monitor.

### 7.2 Quy tắc kiến trúc

- Dữ liệu thường dùng nhưng nhỏ → instructions/selected memory.
- Tiến độ đang làm → structured state/checkpoint.
- Log/tài liệu lớn → archive + locator + retrieval khi cần.
- Xử lý hàng loạt → tool runtime tổng hợp trước khi về LLM.
- Nhiều session → memory lifecycle và policy conflict.
- Prefix lặp → cache-optimized prompt layout nếu provider hỗ trợ.

## 8. IMPLEMENTATION PLAN — CÁC PHASE CODEX PHẢI LÀM

### Phase 0 — Repo audit & baseline

- [ ] Xác định agent loop, provider client, role hierarchy, nơi lưu history, tool registry, trace/logging, cấu hình.
- [ ] Xác định framework, test runner, dependency; tránh trùng module đã có.
- [ ] Tạo baseline: token/cost metrics nếu API hỗ trợ hoặc mock benchmark so sánh.
- [ ] Ghi assumptions/missing API keys và kiến trúc vào docs.

### Phase 1 — Persistent memory

- [ ] Tạo data model/store, migrations/atomic write, CRUD.
- [ ] Implement `retrieve` theo scope, topic/key, state, TTL, token budget.
- [ ] Implement `supersede`, `forget`, `expire`, provenance.
- [ ] Inject memory vào context builder thay vì chỉ lưu vào ổ đĩa.
- [ ] Tạo demo `JWT → session_cookie` qua 3 session độc lập.
- [ ] Tests cho conflict, permissions, missing provenance, expired memory, không leak cross-project.

### Phase 2 — Context builder & compaction

- [ ] Chuẩn hóa các block prompt và priority; đo input budget.
- [ ] Trigger compact theo threshold hoặc events.
- [ ] Archive raw tool outputs, prune duplicates.
- [ ] Implement KEEP/TRUNCATE/DROP có thể giải thích và kiểm thử.
- [ ] Validate structured checkpoint; persist & restore atomic.
- [ ] Reinject rules/skills/plan + selected memory sau compact.
- [ ] Test continuity với goal, constraints, failed attempts, nextAction.

### Phase 3 — Tool result minimization

- [ ] Implement batch analyzer an toàn cho nhiều file/log.
- [ ] Validate scope/path/permissions, timeout, byte cap và redaction.
- [ ] Chỉ trả aggregate + artifactRef; test top-K và token reduction.
- [ ] Không triển khai arbitrary `run_code` nếu thiếu sandbox.

### Phase 4 — Prompt caching & planner

- [ ] Refactor prompt layout: stable prefix, volatile suffix, deterministic tool schema.
- [ ] Normalize provider usage; phân biệt đo thực tế / estimate / mock.
- [ ] Tạo price table tùy provider/model, có ngày cập nhật/đơn vị.
- [ ] `CacheCostPlanner` tính warm/compact/switch + conditional keep-alive.
- [ ] Test số ví dụ $0.055 và $0.057; phân tích TTL, probability, retries.
- [ ] Keep-alive **disabled by default**; policy opt-in với guardrails nếu implement.

### Phase 5 — Verification & handover

- [ ] Chạy test, typecheck, lint; sửa lỗi, không bỏ qua test đỏ.
- [ ] Chạy 3 demos có thể lặp lại, ghi kết quả và số đo before/after.
- [ ] Cập nhật README/setup/config, command examples, migrations, security notes.
- [ ] Tạo báo cáo final: modules thay đổi, commands, test results, evidence, limitations, next actions.

## 9. CONTRACTS, QUAN SÁT VÀ BẢO MẬT

### 9.1 Interface tối thiểu

```ts
interface AgentRequest {
  sessionId: string;
  projectId: string;
  userId?: string;
  task: string;
  model: string;
}

interface ContextBuildResult {
  messages: unknown[];           // provider-specific messages, giữ nguyên role hierarchy
  memoryIdsInjected: string[];
  checkpointId?: string;
  inputTokensEstimated?: number;
  budget: { maxInputTokens: number; remainingTokens: number };
  promptPrefixFingerprint?: string; // fingerprint nội bộ; KHÔNG chứng minh provider cache hit
}

interface AgentRunMetrics {
  sessionId: string;
  requestId: string;
  model: string;
  memoryInjectedCount: number;
  contextTokensBefore?: number;
  contextTokensAfter?: number;
  compactionApplied: boolean;
  cachedInputTokens?: number | null;
  cacheHitRatio?: number | null;
  totalCostUsd?: number | null;
  costIsEstimated: boolean;
  latencyMs?: number;
}
```

### 9.2 Telemetry cần thu thập

- Memory: `retrieved_count`, `injected_ids`, `ignored_expired_count`, `superseded_count`, `retrieval_latency_ms`.
- Context: `estimated_input_tokens`, `provider_input_tokens`, `compaction_before/after_tokens`, `archive_bytes`, `checkpoint_validation`, `lost_constraint_count`.
- Caching: `cached_input_tokens`, `cache_hit_ratio`, `provider`, `model`, `cache_unknown`, `prefix_fingerprint` (chỉ heuristic nội bộ).
- Cost: `input_cost`, `cached_read_cost`, `cache_write_cost`, `output_cost`, `compaction_cost`, `keep_alive_cost`, `total_cost` và provenance của bảng giá.
- Quality: độ chính xác của các tests tình huống; số decision drift, số attempt sai lặp lại; chặn việc “giảm tokens nhưng sai nhiệm vụ”.

Log phải có `requestId`, `sessionId`, tương quan checkpoint/artifact refs nhưng không log secret, prompt nhạy cảm hoặc raw memory không cần thiết. Cache hit thực tế **chỉ xác nhận qua usage của provider**, không dựa đơn thuần vào fingerprint.

### 9.3 Security / Privacy checklist

- [ ] Tenant/user/project isolation khi retrieve memory, checkpoint và archive.
- [ ] Không đưa secrets, credentials hoặc PII vào memory theo mặc định; redaction trước persist/log.
- [ ] Retrieved memory/tool output là **untrusted data**; không cho chúng ghi đè system policies hoặc yêu cầu tool execution trái phép.
- [ ] Chỉ ghi memory nếu đủ nguồn và theo policy; có hành vi forget/expire rõ.
- [ ] File tools: path allowlist, symlink/path traversal prevention, size/time limits.
- [ ] Nếu implement run_code: sandbox, permissions, approval, timeout, resource caps; không có sandbox thì feature bị vô hiệu hóa.
- [ ] Không kỳ vọng prompt cache là cơ chế bảo mật hoặc nơi lưu state dài hạn.
- [ ] Provider caching và data retention phải phù hợp với chính sách dữ liệu của sản phẩm.

## 10. TEST PLAN & FIXTURES

| Test ID | Tình huống | Kỳ vọng |
|---|---|---|
| `MEM-01` | Session mới, history rỗng | Quy ước project từ memory vẫn được retrieve/inject |
| `MEM-02` | JWT được thay thế bằng session cookie | Chỉ quy ước mới active; JWT có status superseded |
| `MEM-03` | Memory expired/forgotten | Không xuất hiện trong retrieval hoặc context |
| `MEM-04` | Hai project cùng key khác value | Không rò memory chéo project |
| `MEM-05` | Tool output giả làm system instructions | Không nâng quyền hoặc thực thi yêu cầu giả mạo |
| `CTX-01` | Tool log rất dài | Trước/sau compact giảm token, constraints còn nguyên |
| `CTX-02` | Checkpoint restore | nextAction đúng, failedAttempts còn, evidenceRefs tồn tại |
| `CTX-03` | Budget quá nhỏ | Bảo toàn instructions, báo lỗi có kiểm soát |
| `CTX-04` | Summary thiếu trường bắt buộc | Reject/fallback, không tiếp tục với checkpoint lỗi |
| `TOOL-01` | 100 file TODO | Kết quả top 5 đúng, không gửi raw content về LLM |
| `TOOL-02` | File ngoài workspace/symlink | Trả permission denied, không đọc dữ liệu |
| `CACHE-01` | Prefix giống nhau + suffix khác | Fingerprint prefix ổn định; không tuyên bố hit nếu thiếu usage |
| `CACHE-02` | Dynamic timestamp trước prefix | Kiểm thử chứng minh đổi prefix; layout mới tránh lỗi |
| `CACHE-03` | Provider usage fixture | Normalize cached/read/write/output đúng |
| `COST-01` | Giá giả định A/B ở bài học | A = $0.055, B = $0.057 |
| `COST-02` | Không có cached tokens | Tính cold cost đúng, tránh hit giả |
| `COST-03` | P(next)=0.6 và phí keep-alive cao | Từ chối keep-alive nếu expected savings không đủ |
| `COST-04` | Compact cần thiết do context limit | Không chọn warm/switch nếu prompt không fit |

**Fixtures tách biệt với real API:** tất cả tests trên chạy deterministic bằng fake provider; integration tests provider thật chỉ chạy khi có cấu hình/API key và không bắt buộc cho CI mặc định.

## 11. BA DEMO / CHALLENGE PHẢI HOÀN THÀNH

### Challenge A — Persistent Memory xuyên session

**Input:** project có quyết định authentication. **Thực hiện:** session 1 tạo memory; session 2 khởi tạo không history, dùng memory; cập nhật JWT → session cookie; session 3 xác minh quy ước mới. **Output:** log `memory_ids_injected`, trạng thái active/superseded và kết quả task. **Pass:** không mất memory cần thiết; không dùng quyết định cũ.

### Challenge B1 — Long session & selective compaction

**Input:** session có rất nhiều tool result, 3 test lỗi, 2 cách sửa không thành công, nextAction. **Thực hiện:** kích hoạt threshold, prune log, tạo checkpoint, restore/reinject và resume. **Output:** số token trước/sau, checkpoint hợp schema, trace của bước kế tiếp. **Pass:** giảm working context nhưng giữ goal/constraints/findings/failedAttempts/nextAction; không lặp giải pháp đã thất bại.

### Challenge B2 — Code Mode / Batch tool analysis

**Input:** 100 file hoặc log. **Thực hiện:** batch analyzer đọc file trong runtime, đếm TODO/ERROR, lấy top 5. **Output:** chỉ aggregate + top 5 + artifact locator, metric input/result size. **Pass:** kết quả đúng và raw data không vào LLM context; không cần arbitrary code execution để đạt MVP.

### Challenge C — Warm / Compact / Switch

**Input:** A có 50k cached tokens, 2k new input, 1k output; Model B cold, pricing giả định ở mục 6.4; thêm compacted input length, compact cost, TTL, xác suất user quay lại, số keep-alive và retry (nêu giả định rõ). **Thực hiện:** tính expected cost cho cả 3 phương án trong 3 kịch bản:

1. User trở lại sau **3 phút**.
2. User trở lại sau **7 phút**.
3. Xác suất user trở lại trong 10 phút là **60%**.

**Output:** bảng tính strategy, assumptions (TTL, phí keep-alive, phí compact, model limits), phương án rẻ nhất **trong số phương án khả thi**, sensitivity khi thay đổi P(revisit) và retry. **Pass:** kiểm chứng được $0.055 và $0.057; không tự khẳng định hit ở phút 7 vì TTL tùy provider, không cố định 5 phút; planner ưu tiên giới hạn context/quality trước giá.

## 12. DEFINITION OF DONE (TIÊU CHÍ NGHIỆM THU CUỐI)

**Tất cả điều sau phải đúng:**

- [ ] Repo build/typecheck/lint/tests xanh, hoặc liệt kê rõ những lỗi có sẵn trước khi thay đổi.
- [ ] Memory thật sự được retrieve và inject sang session mới; supersede và forget hoạt động.
- [ ] Context Builder giữ đúng hierarchy; giới hạn budget và reserve output.
- [ ] Compaction giữ continuity bằng checkpoint schema; không chỉ tạo summary đẹp.
- [ ] Raw log batch không vào model context; xử lý tool an toàn và có cap.
- [ ] Prompt layout có stable prefix; cached tokens và cost được ghi nhận đúng semantics hoặc đánh dấu unknown.
- [ ] Cost planner so sánh đủ warm/compact/switch, tính expected cost, eligibility, TTL và các giả định.
- [ ] Có test A, B1, B2, C và benchmark before/after có thể tái lập.
- [ ] Có tài liệu cách chạy thực tế, rủi ro và quyết định thiết kế.

## 13. MẪU BÁO CÁO CODEx CẦN TRẢ VỀ

```markdown
# Implementation Report

## Repo audit
- Existing architecture / decisions:
- Assumptions / skipped features:

## Implemented
- Memory store, lifecycle and retrieval:
- Context builder, compactor/checkpoints:
- Batch analyzer / sandbox status:
- Provider usage + cost planner:

## Commands run
- <command>: PASS/FAIL

## Evidence
| Scenario | Before | After | Result | Notes |
|---|---:|---:|---|---|
| Memory session 1→3 | — | — | PASS/FAIL | injected memory IDs |
| Long context | input tokens | input tokens | PASS/FAIL | constraints retained |
| Batch logs | tool bytes/tokens | tool bytes/tokens | PASS/FAIL | top-5 correctness |
| Cache pricing | — | A=$0.055/B=$0.057 | PASS/FAIL | mocked pricing |

## Risks and limitations
- ...

## Next steps
- ...
```

## 14. COPY-PASTE PROMPT ĐỂ CHẠY CODEX

> Mở repository đích, đặt file Markdown này trong repo (ví dụ `docs/CODEX_MEMORY_CONTEXT_CACHING.md`) và giao prompt sau cho Codex.

```text
Read docs/CODEX_MEMORY_CONTEXT_CACHING.md in full, then implement it in this
repository. First inspect existing instructions, architecture, agent loop,
provider clients, data stores and tests. Prefer integrating with existing code
rather than building a parallel framework. Work through Phases 0–5 in order.

Required: persistent memory across sessions with supersession/forget,
scoped retrieval and injection, token-aware context building, safe structured
compaction/checkpoint restore, safe batch tool analysis, cache usage metrics,
and warm/compact/switch cost planner. Preserve instruction priority and secure
tool permissions. Keep arbitrary model-generated code execution disabled unless
a real sandbox is available.

Create automated deterministic tests and runnable demos for Challenge A, B1,
B2 and C; verify hypothetical costs A=$0.055 and B=$0.057. Run all available
checks and provide a concise implementation report with measured or explicitly
estimated before/after metrics, paths changed, commands and limitations.
Do not stop after writing a plan: implement and test working code.
```

---

## 15. THAM KHẢO VÀ GIỚI HẠN TÍNH CHÍNH XÁC

**Nguồn kiến thức chính:** [Memory, Context Engineering & Prompt Caching — Agentic AI Engineering, D07](https://pub.nndkhoa9.win/agentic-ai-engineering/d07-mem-context-caching/).

**Các điểm rút ra trực tiếp về nguyên lý:** persistent memory và lifecycle; state/history/memory/context; progressive disclosure; structured checkpoint; KEEP/TRUNCATE/DROP; controlled reboot; xử lý dữ liệu trung gian bằng Code Mode; prompt cache khác response cache; prefix ổn định; TTL, warm/cold, keep-alive expected savings; so sánh chiến lược model/compact/switch; các challenge A/B/C và phép tính minh họa $0.055/$0.057.

**Các quyết định bổ sung để Codex có thể lập trình:** stack mặc định, tên module, TypeScript interfaces, SQLite schema, cấu hình mẫu, thiết kế API, test IDs, security validation, cách triển khai theo phases và acceptance criteria. Đây là kiến trúc **đề xuất**, cần thích nghi với repository thực tế.

**Tài liệu provider (tra cứu khi tích hợp; không hard-code pricing/TTL theo tài liệu này):**

- OpenAI API: https://platform.openai.com/docs/guides/prompt-caching
- OpenAI API Pricing: https://platform.openai.com/pricing
- Anthropic Prompt Caching: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

> **Ưu tiên cuối:** Tính đúng đắn của agent, tính bảo mật và continuity phải đứng trước mục tiêu giảm tokens/giá. Cache tối ưu chi phí xử lý lặp, **không** thay thế memory hay compaction.
