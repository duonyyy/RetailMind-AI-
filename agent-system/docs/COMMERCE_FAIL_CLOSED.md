# Commerce tools: unconfirmed outcomes and fail-closed boundary

## 1. Nguyên Tắc Đóng An Toàn (Fail-Closed Architecture)

The Agent does not fabricate stock, cart, order preview, order status, cancellation, support ticket or refund results when the backend is unavailable or its response lacks the fields required for that tool. Such calls return the `ToolUnavailableError` ("unavailable") and stop the LangGraph workflow safely with an abstention (`abstain` node); failed reads are never recorded as evidence and failed side effects are never cached as successes.

## 2. Quản Trị Trạng Thái Bền Vững & Chống Trùng Lặp (Durable Idempotency)

For side effects, a timeout, server error, malformed response, or other failure after dispatch does **not** prove that the backend did nothing. The following Agent-side controls are a partial mitigation, not a complete end-to-end idempotency guarantee:

- **Idempotency State Machine (`IdempotencyManager`)**: Backed by PostgreSQL in `agent.tool_idempotency` with unique key constraints (`idempotency_key = sha256(thread_id + tool_call_id)`).
- A new call ID is blocked when the same tenant, user, tool and masked-payload fingerprint has an `in_progress` or `unknown_outcome` record. A PostgreSQL advisory transaction lock serializes reservations for that fingerprint. The memory adapter provides only process-local protection, which is lost on restart and not shared across replicas. Masking can cause conservative false matches.
- **State Transitions**:
  - `in_progress`: Execution active; concurrent identical calls are rejected (`idempotency_in_progress`).
  - `completed`: Backend side-effect confirmed; replays return the cached output.
  - `unknown_outcome`: If a timeout or protocol error occurs after payload dispatch (`outcome_ambiguous = True`), the record transitions to `unknown_outcome`. Automatic re-execution is fail-closed locked to prevent duplicate charges or inventory mutations. The caller/user is informed to verify the operation status before retrying.
  - Pre-send network failures (connection refused before dispatch) cleanly abort the reservation, permitting safe client retry.

## 3. Trạng Thái Hiện Tại Của `core-api` Internal Tools

Core-api's internal cart, cancellation, support ticket and favorite routes currently call the corresponding services, but do not persist the Agent's idempotency key atomically with each business mutation. In particular, a cart write can commit before the subsequent cart read fails. They therefore remain unverified for retry after timeout, restart and concurrent calls. A request whose backend execution succeeded but whose final response was lost may need reconciliation even if the Agent recorded `completed`; a new tool call ID alone is not a reliable business intent identifier.

- Refund execution through Agent tools returns `ToolUnavailableError` because financial transactions require authoritative settlement.
- Refund requests within policy thresholds create durable HITL approval records (`agent.hitl_approvals`) for supervisor review.
- Public customer commerce endpoints (via web-client checkout) operate under separate transactional boundaries.

## 4. Dữ Liệu Danh Mục Và Tồn Kho

Catalog search, product detail and comparison require Core responses with the expected product and integer-VND price fields. An explicitly confirmed empty catalog list is returned as empty; backend failure, unconfirmed product identity and malformed responses fail closed. The Agent does not use the local catalog as a fallback for these tools. Inventory fields are removed from catalog results; live inventory requires a separate authoritative lookup. Other tool paths and Core's own data mapping require separate verification.

## 5. Kết Quả Nghiệp Vụ Và Grounding

`query_order_status` and `lookup_order` use a separate internal result contract for a Core-confirmed order ID and one of the Core order states. The critic permits only the exact server-generated order-status sentence, reports `grounding_status=verified_commerce` and returns no document citation or numeric grounding score. Extra model-generated claims are not accepted. A source label in an ordinary tool response does not grant this status. This path is deliberately limited to a single read-only order-status call; other commerce tools, multi-tool requests, side-effect results and RAG do not gain verified grounding through this mechanism. Core/provider live operation and end-to-end ownership enforcement require separate integration tests.
