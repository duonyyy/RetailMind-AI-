"""HTTP boundary tests; the identity service is simulated, never a live backend."""
import asyncio
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

from agent_platform.api.routers import chat, hitl, tools, web_client
from agent_platform.harness.hitl.approval_store import ApprovalStore
from agent_platform.harness.persistence.memory.adapter import MemoryKVStore
from agent_platform.harness.observability.finops import FinOpsLedger
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness import AgentHarness
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger

USERS = {"alice": "CUSTOMER", "bob": "CUSTOMER", "boss": "ADMIN"}


def token(user: str) -> str:
    return f"valid-access-{user}"


@pytest.fixture
def client():
    app = FastAPI()
    for router in (chat.router, hitl.router, tools.router, web_client.router):
        app.include_router(router)
    store = MemoryKVStore()
    harness = SimpleNamespace(kv_store=store, approval_store=ApprovalStore(store),
                              finops_ledger=FinOpsLedger(), tool_registry=ToolRegistry(),
                              pack=SimpleNamespace(pack_dir=None, name="retail_store"),
                              audit_ledger=TamperEvidentHashChainLedger())
    async def resolve_and_resume_hitl(**kwargs):
        return await AgentHarness.resolve_and_resume_hitl(harness, **kwargs)
    harness.resolve_and_resume_hitl = resolve_and_resume_hitl
    app.state.harness = harness

    def identity(request):
        assert request.url.path == "/api/v1/auth/me"
        header = request.headers.get("Authorization", "")
        user = next((u for u in USERS if header == f"Bearer {token(u)}"), None)
        if not user:
            return httpx.Response(401, json={"error": "unauthorized"})
        return httpx.Response(200, json={"success": True, "data": {"id": user, "role": USERS[user]}})

    app.state.identity_transport = httpx.MockTransport(identity)

    async def execute(query, principal, thread_id):
        return {"thread_id": thread_id, "run_id": "run", "final_answer": principal.user_id,
                "status": "done", "grounding_score": None, "evidence": [], "tool_events": []}

    app.state.harness.execute = execute
    with TestClient(app) as test_client:
        yield test_client


def auth(user):
    return {"Authorization": f"Bearer {token(user)}"}


@pytest.mark.parametrize("path", ["/api/hitl/queue", "/api/hitl/pending", "/v1/approvals", "/v1/hitl/pending", "/api/finops/metrics", "/v1/tools"])
def test_admin_lists_require_current_backend_role(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers=auth("alice")).status_code == 403
    assert client.get(path, headers=auth("boss")).status_code == 200
    assert client.get(path, headers={"Authorization": "Bearer dev:boss:admin"}).status_code == 401


@pytest.mark.parametrize("path,body", [
    ("/api/hitl/review", {"task_id": "missing", "decision": "rejected"}),
    ("/api/hitl/missing/approve", None), ("/api/hitl/missing/reject", None),
    ("/v1/approvals/missing", {"decision": "rejected"}),
    ("/v1/hitl/missing/approve", None),
])
def test_all_review_routes_require_admin(client, path, body):
    assert client.post(path, json=body).status_code == 401
    assert client.post(path, json=body, headers=auth("alice")).status_code == 403
    # Rejecting a missing request reaches the store only for the admin.
    if "approve" not in path:
        assert client.post(path, json=body, headers=auth("boss")).status_code == 404


@pytest.mark.parametrize("bad", ["dev:boss:admin", "not-a-jwt", "expired-token", "refresh-token", "forged-admin-token"])
def test_bad_tokens_are_not_guests(client, bad):
    headers = {"Authorization": f"Bearer {bad}"}
    assert client.get("/v1/approvals", headers=headers).status_code == 401
    assert client.post("/api/chat", json={"query": "hello"}, headers=headers).status_code == 401
    assert client.post("/v1/chat", json={"query": "hello"}, headers=headers).status_code == 401


def test_reviewer_spoof_and_unsafe_approval_do_not_resolve(client):
    store = client.app.state.harness.approval_store
    asyncio.run(store.create_request("thread", "run", "request_return_or_refund", {}, approval_id="a1"))
    resp = client.post("/api/hitl/review", headers=auth("boss"), json={"task_id":"a1", "decision":"rejected", "reviewer":"someone-else"})
    assert resp.status_code == 403
    for path in ("/api/hitl/a1/approve", "/v1/hitl/a1/approve"):
        assert client.post(path, headers=auth("boss")).status_code == 409
        assert asyncio.run(store.get_request("a1")).status == "pending"
    resp = client.post("/api/hitl/review", headers=auth("boss"), json={"task_id":"a1", "decision":"rejected"})
    assert resp.status_code == 200
    assert resp.json()["task"]["decision_by"] == "boss"


@pytest.mark.parametrize("path,session_field", [("/v1/chat", "thread_id"), ("/api/chat", "session_id")])
def test_chat_session_ownership(client, path, session_field):
    first = client.post(path, headers=auth("alice"), json={"query":"hello", "client_id":"boss"})
    assert first.status_code == 200
    session_id = first.json()[session_field]
    assert first.json()["final_answer"] == "alice"
    assert client.post(path, headers=auth("alice"), json={"query":"hello", session_field:session_id}).status_code == 200
    assert client.post(path, headers=auth("bob"), json={"query":"hello", session_field:session_id}).status_code == 404
    assert client.post(path, headers=auth("boss"), json={"query":"hello", session_field:session_id}).status_code == 404
    assert client.post(path, json={"query":"hello", session_field:session_id}).status_code == 403


@pytest.mark.parametrize("path,field", [("/v1/chat/stream", "thread_id"), ("/api/chat/stream", "session_id"), ("/api/v1/agent/chat/stream", "session_id")])
def test_stream_checks_ownership_before_streaming(client, path, field):
    assert client.post(path, headers=auth("bob"), json={"query":"hello", field:"unowned"}).status_code == 404
    assert client.post(path, json={"query":"hello", field:"unowned"}).status_code == 403
    assert client.post(path, json={"query":"hello"}).status_code == 200


def test_identity_service_failure_is_not_anonymous(client):
    def unavailable(request):
        raise httpx.ConnectError("offline", request=request)
    client.app.state.identity_transport = httpx.MockTransport(unavailable)
    assert client.post("/api/chat", json={"query":"hello"}, headers=auth("alice")).status_code == 503


def test_support_handoff_emits_only_form_link_without_pii(client):
    from agent_platform.harness.state.contracts import ToolEvent
    async def execute(query, principal, thread_id):
        return {"thread_id": thread_id, "run_id": "run", "status": "abstained", "final_answer": "Vui lòng mở form hỗ trợ.",
                "evidence": [], "tool_events": [ToolEvent(tool_name="create_support_ticket", call_id="call", arguments={}, output="unavailable", is_error=True, execution_time_ms=1)]}
    client.app.state.harness.execute = execute
    result = client.post('/api/chat/stream', headers=auth('alice'), json={'query': 'Liên hệ 0912345678'})
    assert result.status_code == 200
    assert '"type": "support_form"' in result.text
    assert '"path": "/support"' in result.text
    assert '0912345678' not in result.text
    guest = client.post('/api/chat/stream', json={'query': 'hello'})
    assert '"type": "support_form"' not in guest.text
