from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from agent_platform.config.loader import load_settings
from agent_platform.domain.pack import DomainPack
from agent_platform.api.app import create_app

def setup_client() -> TestClient:
    settings = load_settings(env="test")
    domain_dir = Path(__file__).parents[2] / "domains" / "retail_store"
    pack = DomainPack.load_from_dir(domain_dir)
    app = create_app(settings=settings, pack=pack)
    return TestClient(app)

def test_unauthorized_call_returns_401():
    client = setup_client()
    resp = client.post("/v1/chat", json={"query": "Tôi muốn hỏi chính sách"})
    assert resp.status_code == 401
    assert "Unauthorized" in resp.json()["detail"]

def test_authenticated_chat_returns_200():
    client = setup_client()
    resp = client.post(
        "/v1/chat",
        json={"query": "Thời gian đổi trả là bao lâu?"},
        headers={"Authorization": "Bearer dev:alice:customer"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "thread_id" in data
    assert "final_answer" in data
    assert data["status"] in ("done", "running", "abstained")

def test_chat_stream_sse_endpoint():
    client = setup_client()
    resp = client.post(
        "/v1/chat/stream",
        json={"query": "Tư vấn sản phẩm"},
        headers={"Authorization": "Bearer dev:alice:customer"},
    )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    body = resp.text
    assert "event: run.started" in body
    assert "event: run.done" in body

def test_role_enforcement_for_admin_endpoints():
    client = setup_client()

    # Customer role is rejected with 403 Forbidden
    resp_cust = client.get(
        "/v1/approvals",
        headers={"Authorization": "Bearer dev:alice:customer"},
    )
    assert resp_cust.status_code == 403
    assert "Forbidden" in resp_cust.json()["detail"]

    # Admin role is allowed with 200 OK
    resp_admin = client.get(
        "/v1/approvals",
        headers={"Authorization": "Bearer dev:boss:admin"},
    )
    assert resp_admin.status_code == 200
    assert isinstance(resp_admin.json(), list)

def test_health_and_metrics_endpoints():
    client = setup_client()

    resp_live = client.get("/health/live")
    assert resp_live.status_code == 200
    assert resp_live.json()["status"] == "alive"

    resp_ready = client.get("/health/ready")
    assert resp_ready.status_code == 200
    assert resp_ready.json()["status"] == "ready"

    resp_metrics = client.get("/metrics")
    assert resp_metrics.status_code == 200
    assert "platform_runs_total" in resp_metrics.text
