# Commerce tools: unconfirmed outcomes and fail-closed boundary

## 1. Nguyên Tắc Đóng An Toàn (Fail-Closed Architecture)

The Agent does not fabricate stock, cart, order preview, order status, cancellation, support ticket or refund results when the backend is unavailable or its response lacks the fields required for that tool. Such calls return the `ToolUnavailableError` ("unavailable") and stop the LangGraph workflow safely with an abstention (`abstain` node); failed reads are never recorded as evidence and failed side effects are never cached as successes.

## 2. Quản Trị Trạng Thái Bền Vững & Chống Trùng Lặp (Durable Idempotency)

For side effects, a network timeout or connection drop after dispatch does **not** prove that the backend did nothing. To prevent duplicate executions across process restarts and distributed workers:

- **Idempotency State Machine (`IdempotencyManager`)**: Backed by PostgreSQL in `agent.tool_idempotency` with unique key constraints (`idempotency_key = sha256(thread_id + tool_call_id)`).
- **State Transitions**:
  - `in_progress`: Execution active; concurrent identical calls are rejected (`idempotency_in_progress`).
  - `completed`: Backend side-effect confirmed; replays return the cached output.
  - `unknown_outcome`: If a timeout or protocol error occurs after payload dispatch (`outcome_ambiguous = True`), the record transitions to `unknown_outcome`. Automatic re-execution is fail-closed locked to prevent duplicate charges or inventory mutations. The caller/user is informed to verify the operation status before retrying.
  - Pre-send network failures (connection refused before dispatch) cleanly abort the reservation, permitting safe client retry.

## 3. Trạng Thái Hiện Tại Của `core-api` Internal Tools

Core-api's internal inventory, cart, order preview/status/cancellation and support ticket routes (`/api/v1/internal/tools/*` in `InternalAgentController`) currently return HTTP 503 (`ServiceUnavailableException: commerceUnavailable()`) because authoritative database transaction boundaries, ACID row locks (`SELECT ... FOR UPDATE`), and verified customer ownership checks are being hardened in backend services.

- Refund execution through Agent tools returns `ToolUnavailableError` because financial transactions require authoritative settlement.
- Refund requests within policy thresholds create durable HITL approval records (`agent.hitl_approvals`) for supervisor review.
- Public customer commerce endpoints (via web-client checkout) operate under separate transactional boundaries.

## 4. Dữ Liệu Tồn Kho Danh Mục (Catalog Fallback)

Catalog fallback results omit inventory and stock fields (`stock_available`, `available_qty`, etc.) because static catalog fallback data cannot establish live real-time inventory availability across MWG store branches. Live inventory requires verified queries against the authoritative PostgreSQL database.
