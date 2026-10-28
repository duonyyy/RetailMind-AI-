# Identity, chat ownership and HITL boundary

## HTTP contract

- The agent resolves every supplied Bearer token against core-api's `GET /api/v1/auth/me` at `CORE_API_URL` (default `http://localhost:4000`). The backend checks the token and returns the current active user's ID and role. An invalid token returns 401; an unavailable or invalid identity service returns 503. The agent does not accept `dev:` identities.
- Requests without Authorization may start anonymous chat as a server-generated guest. They do not become customers, and guest sessions cannot be resumed. An invalid Authorization header is never silently downgraded to guest.
- Authenticated chat sessions are created by the server; to resume, pass the returned `thread_id` or `session_id`. The same user and tenant must own it. Unknown and other users' sessions return 404; guest resume returns 403. Legacy client-chosen session IDs have no owner record and cannot be resumed.
- `/v1/chat/stream` returns its session ID in the `run.started` event. `/api/chat/stream` returns a `session` event. `/api/chat` and `/v1/chat` include the ID in their JSON responses.
- All `/api/hitl/*`, `/v1/approvals*`, `/v1/hitl/*`, `/v1/tools` and `/api/finops/metrics` routes require an authenticated admin. `reviewer`, if provided, must match that authenticated user's ID. Rejection records that ID.
- Approval currently returns 409 and leaves the request pending. Existing approval records do not bind a verified requester, and the former resume path invoked a tool as admin while bypassing the executor. Rejection remains available. Restore execution only after implementing and testing requester-bound authorization, durable atomic approval/resume and backend ownership checks.

## Deployment and limits

`CORE_API_URL` is a trusted server-side deployment setting, not request input. Agent and core must have a trusted network path; use TLS when crossing an untrusted network. Do not publish an agent image with an attacker-controlled identity service URL. The Compose deployment already supplies the internal backend URL.

The session-owner mapping uses the existing KV adapter; its durability and multi-instance behavior depend on that adapter. The graph checkpoint is currently in memory. Tests in `test_identity_hitl_boundary.py` exercise real HTTP router/dependency handling with a simulated identity service and harness; they do not validate a live core-api, database, provider, or deployment.

This change does not establish order ownership for internal commerce tools. In particular, internal order status/cancellation paths still require separate backend ownership work and should not be exposed as trusted customer operations. It also does not implement atomic approval resolution, durable checkpoints, PII masking or safe commerce fallbacks.
