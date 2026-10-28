# Commerce tools: unconfirmed outcomes

The Agent does not fabricate stock, cart, order preview, order status, cancellation, support ticket or refund results when the backend is unavailable or its response lacks the fields required for that tool. Such calls return the `unavailable` tool error and stop the graph with an abstention; failed reads are not recorded as evidence and failed side effects are not cached as successes.

For side effects a timeout does **not** prove that the backend did nothing. The response tells the caller to check the operation's state before retrying; it is not a retry instruction. Exactly-once execution and durable idempotency are not implemented by this change.

Core's internal inventory, cart, order preview/status/cancellation and ticket routes currently return HTTP 503 because their implementations use in-memory or fabricated data, lack a verified ownership boundary, or cannot confirm the operation. Refund execution also returns unavailable because no trusted refund implementation is connected. The existing refund policy may still create a pending HITL request for some amounts; approval remains blocked by the identity/HITL boundary. Restore each route only after its authoritative backend contract and ownership checks are implemented and tested. Other public commerce APIs are outside this change and must not be assumed fixed.

Catalog results omit inventory fields because catalog fallback data cannot establish current availability. This does not address the separate catalog-price fallback.
