# Identity, Chat Ownership and HITL Boundary

## 1. HTTP Authentication & Authorization Contract

- **Token Verification (Single Source of Truth)**: The agent resolves every Bearer token against core-api's `GET /api/v1/auth/me` at `CORE_API_URL` (default `http://localhost:4000`). The backend verifies the token and returns the active user's ID, role, and profile.
  - An invalid token returns HTTP 401 Unauthorized.
  - An unavailable or non-responsive identity service returns HTTP 503 Service Unavailable.
  - The agent rejects mock/developer identities (`dev:*`) in production environments.
- **Anonymous Guest Chat**: Requests without an `Authorization` header start an anonymous session as a server-generated guest (`guest_user` / UUID). Guests cannot be resumed once disconnected. An invalid `Authorization` header is **never** silently downgraded to guest.
- **Session & Thread Ownership (Anti-IDOR)**:
  - Authenticated chat sessions are created by the server and tied immutably to `(user_id, tenant_id)`.
  - To resume a session, clients provide the returned `thread_id` or `session_id`.
  - Accessing non-existent or other users' sessions returns HTTP 404 Not Found. Attempting to resume a guest session returns HTTP 403 Forbidden.
- **Streaming Event Protocol**:
  - `/v1/chat/stream` emits its session ID in the initial `run.started` SSE event.
  - `/api/chat/stream` emits a `session` SSE event.
  - `/api/chat` and `/v1/chat` return the session and thread identifiers in their JSON response payload.
- **Admin Privilege Gates**:
  - All management and governance endpoints (`/api/hitl/*`, `/v1/approvals*`, `/v1/hitl/*`, `/v1/tools`, `/api/finops/metrics`) strictly require an authenticated user with role `admin` (`require_role("admin")`).
  - When an admin reviews or rejects an approval, the system enforces that `decision_by` matches the authenticated admin's ID.

## 2. HITL Approval & Resume Flow (Atomic Single-Winner)

Human-in-the-Loop approval and deferred tool execution are fully implemented:

- **Approval Queue (`ApprovalStore`)**:
  - Backed by durable storage in PostgreSQL (`agent.hitl_approvals`).
  - Stores `approval_id`, `thread_id`, `run_id`, `tool_name`, `arguments`, `requester_user_id`, `requester_tenant_id`, and `status`.
  - **Atomic Single-Winner Guarantee**: Status updates execute via conditional row updates (`UPDATE agent.hitl_approvals SET status = ... WHERE status = 'pending'`). Concurrent reviewer races result in exactly one winner; duplicate approval attempts return HTTP 409 Conflict without overwriting the record.
- **Requester-Bound Resume Execution (`AgentHarness.resolve_and_resume_hitl`)**:
  - When approved, deferred tool execution resumes using the original requester's verified principal credentials (`requester_user_id`), preserving server-side authorization boundaries and anti-IDOR enforcement.
  - Side-effect execution is protected by the PostgreSQL `IdempotencyManager` and logged to the tamper-evident audit ledger (`agent.audit_ledger`).

## 3. Durable Checkpoint & Session Persistence

- **PostgreSQL Checkpointer (`PersistentCheckpointer`)**:
  - Graph checkpoints are saved durably in PostgreSQL 16+ via `AsyncPostgresSaver` / `PostgresSaver`.
  - Fail-closed configuration: Durable adapters (`postgres`, `sqlite`) never fall back silently to in-memory storage. `MemorySaver` is strictly restricted to isolated offline unit testing.
  - Sessions survive process restarts and container redeployments, allowing pending HITL workflows to resume accurately.
- **PII Redaction Guardrails**:
  - All input messages and persisted audit records undergo Vietnamese PII masking (CCCD 12 số, SĐT 10 số, Email, Số thẻ thanh toán) conforming to Decree 13/2023/ND-CP and Law 91/2025/QH15 before being passed to LLM providers or long-term persistence.

## 4. Deployment Architecture

`CORE_API_URL` is a server-side environment variable (`http://localhost:4000`), not user-controlled input. Network configuration alone is not evidence of isolation; the Core port may also be published on the host.

Customer-scoped internal tools require both the service secret and the end user's access token. The Agent keeps the incoming bearer credential in request-scoped context rather than graph state or checkpoints and forwards it only to customer-scoped Core tools. Core verifies its signature, expiry and access-token type, reloads the active user and role, and ignores customer IDs supplied in headers or request bodies. Customers are restricted by Core's order ownership checks; verified admins can query or cancel other customers' orders subject to Core's lifecycle rules. Cart, favorite and ticket operations use the authenticated user's own ID. Missing or invalid credentials fail closed. This is a source-level contract; live HTTP, database, deployment and credential-leak verification remain separate gates.

Verification of this security boundary is covered in:
- `tests/e2e/test_identity_hitl_boundary.py` (HTTP auth, guest bounds, admin routes)
- `tests/integration/test_postgres_durable_persistence.py` (PostgreSQL checkpoints, concurrent approval race, restart recovery)
- `tests/unit/test_pii_redaction_and_egress.py` (PII masking and tamper-evident audit trail)
