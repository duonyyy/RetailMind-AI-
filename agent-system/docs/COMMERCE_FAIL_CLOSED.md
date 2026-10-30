# Commerce tools: unconfirmed outcomes and fail-closed boundary

## 1. Nguyên Tắc Đóng An Toàn (Fail-Closed Architecture)

The Agent does not fabricate stock, cart, order preview, order status, cancellation, support ticket or refund results when the backend is unavailable or its response lacks the fields required for that tool. Such calls return the `ToolUnavailableError` ("unavailable") and stop the LangGraph workflow safely with an abstention (`abstain` node); failed reads are never recorded as evidence and failed side effects are never cached as successes.

## 2. Quản Trị Trạng Thái Bền Vững & Chống Trùng Lặp (Durable Idempotency)

For side effects, a timeout, server error, malformed response, or other failure after dispatch does **not** prove that the backend did nothing. The following Agent-side controls are a partial mitigation, not a complete end-to-end idempotency guarantee:

- **Idempotency State Machine (`IdempotencyManager`)**: Backed by PostgreSQL in `agent.tool_idempotency` when configured. The Agent reservation key is `sha256(thread_id + tool_call_id)`; a separate generated UUIDv4 is persisted and sent to Core as `Idempotency-Key`.
- A new call ID is blocked when the same tenant, user, tool and masked-payload fingerprint has an `in_progress` or `unknown_outcome` record. A PostgreSQL advisory transaction lock serializes reservations for that fingerprint. The memory adapter provides only process-local protection, which is lost on restart and not shared across replicas. Masking can cause conservative false matches.
- **State Transitions**:
  - `in_progress`: Execution active; concurrent identical calls are rejected (`idempotency_in_progress`).
  - `completed`: Backend side-effect confirmed; replays return the cached output.
  - `unknown_outcome`: If a timeout or protocol error occurs after payload dispatch (`outcome_ambiguous = True`), the record transitions to `unknown_outcome`. Automatic re-execution is fail-closed locked to prevent duplicate charges or inventory mutations. The caller/user is informed to verify the operation status before retrying.
  - Pre-send network failures (connection refused before dispatch) cleanly abort the reservation, permitting safe client retry.

## 3. Trạng Thái Hiện Tại Của `core-api` Internal Tools

Core's Agent gateway requires a UUIDv4 key for cart add/remove, order cancellation, support ticket creation and favorite updates. Each operation records the key, request hash and result in `idempotency_keys` in the same PostgreSQL transaction as the mutation. A repeated key with changed payload is rejected; an identical completed key replays the stored result. The key is scoped to the authenticated actor, and replay of an order cancellation still rechecks ownership. Isolated PostgreSQL tests exercise concurrency, reconnect, rollback and a simulated lost response; production deployment and live HTTP behavior remain unverified.

A request whose backend execution succeeded but whose final response was lost may still need reconciliation even if the Agent recorded `completed`: a new model tool call generates a new UUID and is not a stable business intent identifier. The Core result has no automatic cleanup/expiry policy. Public customer routes retain their existing contracts; this change applies to the Agent gateway only.

- Refund execution through Agent tools returns `ToolUnavailableError` because financial transactions require authoritative settlement.
- Qualifying refund requests can be recorded for review, but approval execution remains fail-closed until a trusted refund operation and complete immutable intent exist.
- Public customer commerce endpoints (via web-client checkout) operate under separate transactional boundaries.

## 4. Dữ Liệu Danh Mục Và Tồn Kho

Catalog search, product detail and comparison require Core responses with the expected product and integer-VND price fields. An explicitly confirmed empty catalog list is returned as empty; backend failure, unconfirmed product identity and malformed responses fail closed. The Agent does not use the local catalog as a fallback for these tools. Inventory fields are removed from catalog results; live inventory requires a separate authoritative lookup. Other tool paths and Core's own data mapping require separate verification.

## 5. Kết Quả Nghiệp Vụ Và Grounding

`query_order_status`, `lookup_order`, catalog search/detail/comparison and `view_cart` use separate internal result markers after their Core responses pass validation. A single successful read is rendered directly by the server with `grounding_status=verified_commerce`, without asking the model to repeat it, adding document citations or providing a numerical grounding score. Cart reads also require a matching customer ID and consistent integer-VND amounts. A source label in an ordinary tool response does not grant this status.

For cart add/remove, cancel, ticket and favorite, `commerce_contracts.py` defines typed minimum Core response schemas and verifies relevant customer, identifier and action bindings. The server renders a confirmed result without a second model turn and saves its masked answer with the idempotency replay. A malformed post-dispatch response is unknown, not a confirmed failure. A request containing multiple tool calls with a write is stopped before execution and must be split. Preview and RAG remain outside this verified response path. These contracts and mocked tests do not establish live Core/provider behavior or end-to-end ownership enforcement.

An ambiguous post-dispatch side-effect response terminates with `unknown_outcome`; clients must not interpret it as a failed transaction or repeat it blindly. This is an Agent-side signal, not a replacement for a Core transaction that atomically commits the business operation and its idempotency result.
