"""Mandatory Integration & E2E Verification Suite for Durable PostgreSQL Agent Persistence.

Covers Step 7 (A, B, C, D, E):
- 7A: Real PostgreSQL checkpoints, container/process restart simulation, reload by owner, cross-principal rejection,
      and least-privilege runtime role boundary (`retailmind_agent_runtime` denied on `public.*` commerce tables and DDL).
- 7B: Persistence failures (unreachable DB, broken write/commit) fail-closed with zero fallback to `MemorySaver`
      or `sqlite3 :memory:`, zero fake HTTP 200 OK, and zero DSN/password/PII leak.
- 7C: Session ownership & atomic HITL across Guest/Customer/Admin, forged tokens, spoofed reviewer, both route groups
      (`/v1/approvals*` & `/api/hitl*`), concurrent two-reviewer race (single winner), restart persistence, and
      locked HITL resume (`approved` -> 409).
- 7D: Side-effect tool idempotency in PostgreSQL: replay on same key+payload, conflict on different payload/principal,
      concurrent `in_progress` rejection, persistence across restart, pre-send error retry, post-send timeout
      `unknown_outcome` fail-closed lock, and backend error never cached as success.
- 7E: Durable tamper-evident audit ledger across restarts, PII masking verification, and strict test fixture cleanup.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict
from urllib.parse import quote, urlparse

import httpx
import psycopg
import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel

from agent_platform.api.app import create_app
from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.harness import AgentHarness
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.hitl.approval_store import ApprovalStore
from agent_platform.harness.persistence.checkpointer import PersistentCheckpointer
from agent_platform.harness.persistence.ports import PersistenceError
from agent_platform.harness.persistence.postgres.adapter import PostgresKVStore
from agent_platform.harness.persistence.postgres.migrations import (
    apply_agent_migrations,
)
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.spec import ToolContext, ToolUnavailableError, tool


def _resolve_test_dsns() -> tuple[str, str]:
    """Build admin DSN and least-privilege runtime DSN without printing secrets."""
    repo_root = Path(__file__).resolve().parents[3]
    env_file = repo_root / ".env"
    env_map = dotenv_values(env_file) if env_file.exists() else {}

    env_dsn = os.getenv("AGENT_POSTGRES_URL") or os.getenv("POSTGRES_URL") or ""
    parsed_env = urlparse(env_dsn) if env_dsn.startswith("postgres") else None
    parsed_env_pw = parsed_env.password if parsed_env else None

    pg_host = (
        os.getenv("TEST_PG_HOST")
        or (parsed_env.hostname if parsed_env and parsed_env.hostname else None)
        or "localhost"
    )
    pg_port = (
        os.getenv("TEST_PG_PORT")
        or (str(parsed_env.port) if parsed_env and parsed_env.port else None)
        or "5432"
    )
    pg_db = (
        os.getenv("TEST_PG_DB")
        or (parsed_env.path.lstrip("/") if parsed_env and parsed_env.path else None)
        or "retailmind_db"
    )
    admin_user = os.getenv("TEST_PG_ADMIN_USER", "retailmind_user")
    admin_pw = os.getenv("TEST_PG_ADMIN_PASSWORD", "secure_password_change_me")

    rt_user = (
        os.getenv("AGENT_DB_RUNTIME_USER")
        or env_map.get("AGENT_DB_RUNTIME_USER")
        or (parsed_env.username if parsed_env and parsed_env.username else None)
        or "retailmind_agent_runtime"
    )
    rt_pw = (
        os.getenv("AGENT_DB_RUNTIME_PASSWORD")
        or env_map.get("AGENT_DB_RUNTIME_PASSWORD")
        or env_map.get("DB_APP_PASSWORD")
        or parsed_env_pw
        or "agent_runtime_local_pw"
    )

    admin_dsn = (
        f"postgresql://{admin_user}:{quote(str(admin_pw), safe='')}@{pg_host}:{pg_port}/{pg_db}"
    )
    runtime_dsn = (
        f"postgresql://{rt_user}:{quote(str(rt_pw), safe='')}@{pg_host}:{pg_port}/{pg_db}"
    )
    return admin_dsn, runtime_dsn


class _SafePgEnv(dict):
    """Dict subclass that redacts DSNs in __repr__ / __str__ so pytest tracebacks never print credentials."""

    def __repr__(self) -> str:
        return f"<SafePgEnv schema={self.get('schema')!r} dsn=[REDACTED]>"

    def __str__(self) -> str:
        return self.__repr__()


@pytest.fixture(scope="module")
def isolated_pg_env():
    """
    Creates an isolated test schema in PostgreSQL with the exact least-privilege
    grants for `retailmind_agent_runtime`, and drops ONLY that synthetic schema on teardown.
    Also records row counts in `agent.*` and `public.*` before and after to prove
    zero existing user data is modified or deleted.
    """
    admin_dsn, runtime_dsn = _resolve_test_dsns()
    test_schema = f"agent_test_{uuid.uuid4().hex[:8]}"

    repo_root = Path(__file__).resolve().parents[3]
    env_file = repo_root / ".env"
    env_map = dotenv_values(env_file) if env_file.exists() else {}
    env_dsn = os.getenv("AGENT_POSTGRES_URL") or os.getenv("POSTGRES_URL") or ""
    parsed_env_pw = urlparse(env_dsn).password if env_dsn.startswith("postgres") else None

    rt_user = (
        os.getenv("AGENT_DB_RUNTIME_USER")
        or env_map.get("AGENT_DB_RUNTIME_USER")
        or "retailmind_agent_runtime"
    )
    rt_pw = (
        os.getenv("AGENT_DB_RUNTIME_PASSWORD")
        or env_map.get("AGENT_DB_RUNTIME_PASSWORD")
        or env_map.get("DB_APP_PASSWORD")
        or parsed_env_pw
        or "agent_runtime_local_pw"
    )

    # Record baseline counts in `agent` and `public` schemas before tests
    with psycopg.connect(admin_dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM public.orders")
            orders_before = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM agent.checkpoints")
            agent_cp_before = cur.fetchone()[0]

    # Apply migration to isolated test schema and restore default search_path to `agent` afterwards
    apply_agent_migrations(
        admin_dsn=admin_dsn,
        schema=test_schema,
        runtime_user=rt_user,
        runtime_password=rt_pw,
    )
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("ALTER ROLE retailmind_agent_runtime SET search_path TO agent")

    yield _SafePgEnv(
        {
            "admin_dsn": admin_dsn,
            "runtime_dsn": runtime_dsn,
            "schema": test_schema,
        }
    )

    # Cleanup: drop ONLY the synthetic isolated test schema and verify zero leftover
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(f"DROP SCHEMA IF EXISTS {test_schema} CASCADE")
            cur.execute(
                "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
                (test_schema,),
            )
            assert cur.fetchone() is None, f"Test schema {test_schema} was not cleaned up!"

            # Verify pre-existing data in `public` and `agent` schemas was untouched
            cur.execute("SELECT count(*) FROM public.orders")
            assert cur.fetchone()[0] == orders_before
            cur.execute("SELECT count(*) FROM agent.checkpoints")
            assert cur.fetchone()[0] == agent_cp_before


# =============================================================================
# STEP 7A — Least-Privilege Role Boundary, Checkpoint Persistence & Restart
# =============================================================================
def test_7a_least_privilege_runtime_role_boundary(isolated_pg_env):
    """
    Verifies that `retailmind_agent_runtime`:
    1. Connects with `current_user == 'retailmind_agent_runtime'` and `current_schema() == 'agent'`.
    2. Is DENIED (`InsufficientPrivilege`) on all core commerce tables (`orders`, `inventory`,
       `carts`, `users`, `variants`, `products`, `idempotency_keys`).
    3. Is DENIED (`InsufficientPrivilege`) on DDL (`CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`).
    4. Is DENIED (`InsufficientPrivilege`) on `UPDATE` and `DELETE` against `audit_events` (append-only).
    """
    runtime_dsn = isolated_pg_env["runtime_dsn"]
    schema = isolated_pg_env["schema"]

    with psycopg.connect(runtime_dsn) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT current_user, current_schema()")
            user_name, current_sch = cur.fetchone()
            assert user_name == "retailmind_agent_runtime"
            assert current_sch == "agent"

    # 1. Verify core business tables in `public` are strictly inaccessible
    protected_tables = [
        "orders",
        "order_items",
        "inventory",
        "carts",
        "cart_items",
        "users",
        "variants",
        "products",
        "idempotency_keys",
        "support_tickets",
    ]
    for tbl in protected_tables:
        with psycopg.connect(runtime_dsn, autocommit=True) as conn:
            with conn.cursor() as cur:
                with pytest.raises(psycopg.errors.InsufficientPrivilege):
                    cur.execute(f"SELECT count(*) FROM public.{tbl}")

    # 2. Verify runtime role cannot execute DDL in `agent`, `public`, or test schema
    for target_sch in ("public", "agent", schema):
        with psycopg.connect(runtime_dsn, autocommit=True) as conn:
            with conn.cursor() as cur:
                with pytest.raises(psycopg.errors.InsufficientPrivilege):
                    cur.execute(f"CREATE TABLE {target_sch}.unauthorized_ddl_probe (id INT)")

    # 3. Verify runtime role cannot DROP or ALTER existing agent tables
    with psycopg.connect(runtime_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cur.execute(f"DROP TABLE {schema}.checkpoints")
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cur.execute(f"ALTER TABLE {schema}.audit_events ADD COLUMN hacked TEXT")

    # 4. Verify runtime role cannot UPDATE or DELETE rows in `audit_events`
    with psycopg.connect(runtime_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cur.execute(f"DELETE FROM {schema}.audit_events")
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                cur.execute(f"UPDATE {schema}.audit_events SET decision = 'tampered'")


def test_7a_checkpoint_persists_across_restart_and_blocks_other_principals(isolated_pg_env):
    """
    Verifies that LangGraph checkpoints and thread ownership:
    1. Are written to PostgreSQL by AgentHarness Instance 1 (using `retailmind_agent_runtime`).
    2. Survive complete teardown of Instance 1 and are reloaded by a fresh AgentHarness Instance 2.
    3. Allow the same principal (`alice`) to resume and append a second turn on the same `thread_id`.
    4. Reject any other principal (`bob`, `admin`, `guest`) from reading or executing on `alice`'s thread.
    """
    async def _run():
        runtime_dsn = isolated_pg_env["runtime_dsn"]
        schema = isolated_pg_env["schema"]

        domain_dir = Path(__file__).resolve().parents[2] / "domains" / "retail_store"
        pack = DomainPack.load_from_dir(domain_dir)

        def make_settings() -> PlatformSettings:
            s = PlatformSettings()
            s.persistence.adapter = "postgres"
            s.persistence.postgres_url = runtime_dsn
            s.persistence.postgres_schema = schema
            s.llm.provider = "scripted"
            return s

        alice = Principal(user_id="synth_alice_7a", role="customer", tenant_id="default")
        bob = Principal(user_id="synth_bob_7a", role="customer", tenant_id="default")
        guest = Principal(user_id="guest_anon_7a", role="guest", tenant_id="default")
        thread_id = f"thread_synth_7a_{uuid.uuid4().hex[:10]}"

        # --- Process Instance 1: Create thread and checkpoint ---
        harness_1 = AgentHarness(settings=make_settings(), pack=pack)
        state_1 = await harness_1.execute(
            query="Xin chào, tôi muốn hỏi thông tin bảo hành",
            principal=alice,
            thread_id=thread_id,
        )
        assert state_1["thread_id"] == thread_id
        assert len(state_1["messages"]) >= 2
        await harness_1.aclose()
        del harness_1

        # --- Process Instance 2 (Simulating Process Restart) ---
        harness_2 = AgentHarness(settings=make_settings(), pack=pack)
        try:
            # Reload checkpoint state as owner `alice`
            reloaded = await harness_2.get_thread_state(thread_id, alice)
            assert reloaded is not None
            assert reloaded.get("thread_id") == thread_id
            assert len(reloaded.get("messages", [])) >= 2

            # Continue conversation on the same thread_id after restart
            state_2 = await harness_2.execute(
                query="Cảm ơn, cho tôi hỏi thêm về đổi trả",
                principal=alice,
                thread_id=thread_id,
            )
            # Messages from Turn 1 (before restart) + Turn 2 (after restart) are accumulated
            assert len(state_2["messages"]) > len(state_1["messages"])

            # Cross-principal access by `bob` or `guest` must be rejected
            with pytest.raises(PermissionError):
                await harness_2.get_thread_state(thread_id, bob)
            with pytest.raises(PermissionError):
                await harness_2.execute(
                    query="Hijack thread",
                    principal=bob,
                    thread_id=thread_id,
                )
            with pytest.raises(PermissionError):
                await harness_2.get_thread_state(thread_id, guest)
        finally:
            await harness_2.aclose()

    asyncio.run(_run())


# =============================================================================
# STEP 7B — Persistence Failure Simulation (Fail-Closed & Zero Secret Leak)
# =============================================================================
def test_7b_persistence_failures_fail_closed_and_scrub_secrets(isolated_pg_env, caplog):
    """
    Simulates unreachable PostgreSQL and mid-operation write failures:
    - Proves Checkpointer (sync + async), KVStore, ApprovalStore, IdempotencyManager,
      and AuditLedger all raise `PersistenceError` and NEVER fall back to `MemorySaver` or `:memory:`.
    - Proves HTTP endpoints return 503 (never 200 OK) when PostgreSQL is unavailable.
    - Proves passwords, DSNs, tokens, and PII are never leaked in logs, exceptions, or HTTP responses.
    """
    async def _run():
        secret_pw = "UltraSecretPgPass_DoNotLeak_98765"
        broken_dsn = f"postgresql://retailmind_agent_runtime:{secret_pw}@127.0.0.1:59997/retailmind_db"
        schema = isolated_pg_env["schema"]

        caplog.set_level(logging.DEBUG)

        # 1. Checkpointer fail-closed (async and sync)
        cp = PersistentCheckpointer(
            adapter_type="postgres",
            postgres_url=broken_dsn,
            postgres_schema=schema,
            auto_setup=False,
        )
        cfg = {"configurable": {"thread_id": "t_fail", "checkpoint_ns": ""}}
        with pytest.raises(PersistenceError) as exc_async:
            await cp.aget_tuple(cfg)
        assert secret_pw not in str(exc_async.value)
        assert not isinstance(cp._target, MemorySaver)

        with pytest.raises(PersistenceError) as exc_sync:
            cp.get_tuple(cfg)
        assert secret_pw not in str(exc_sync.value)
        assert not isinstance(cp._target, MemorySaver)
        await cp.aclose()

        # 2. SQLite `:memory:` rejected when durable `sqlite` adapter is configured
        cp_sqlite_mem = PersistentCheckpointer(adapter_type="sqlite", sqlite_path=":memory:")
        with pytest.raises(PersistenceError):
            await cp_sqlite_mem.aget_tuple(cfg)
        with pytest.raises(PersistenceError):
            cp_sqlite_mem.get_tuple(cfg)

        # 3. PostgresKVStore & ApprovalStore fail-closed
        kv = PostgresKVStore(dsn=broken_dsn, schema=schema, connect_timeout=1)
        assert not hasattr(kv, "_mem_conn"), "PostgresKVStore must not hold a sqlite3 :memory: connection"
        with pytest.raises(PersistenceError) as kv_exc:
            await kv.set("chat_owner:t1", {"user_id": "u1", "tenant_id": "default"})
        assert secret_pw not in str(kv_exc.value)

        app_store = ApprovalStore(kv)
        with pytest.raises(PersistenceError):
            await app_store.create_request("t1", "r1", "request_return_or_refund", {"amount": "500000"})
        with pytest.raises(PersistenceError):
            await app_store.resolve("app_1", "rejected", "boss")

        # 4. IdempotencyManager & AuditLedger fail-closed
        idem = IdempotencyManager(dsn=broken_dsn, schema=schema, adapter="postgres", connect_timeout=1)
        with pytest.raises(PersistenceError) as idem_exc:
            idem.begin_execution("key_1", user_id="u1", thread_id="t1", tool_name="add_to_cart", call_id="c1")
        assert secret_pw not in str(idem_exc.value)
        assert not idem._store

        audit = TamperEvidentHashChainLedger(dsn=broken_dsn, schema=schema, adapter="postgres", connect_timeout=1)
        with pytest.raises(PersistenceError) as aud_exc:
            audit.record_event(
                event_id="ev_fail",
                thread_id="t1",
                user_id="u1",
                role="customer",
                tenant_id="default",
                tool_name="add_to_cart",
                input_masked={"phone": "0912345678"},
                decision="executed",
            )
        assert secret_pw not in str(aud_exc.value)
        assert len(audit._events) == 0

        # 5. HTTP API fail-closed (returns 503, never 200 OK, and never leaks DSN/password)
        domain_dir = Path(__file__).resolve().parents[2] / "domains" / "retail_store"
        pack = DomainPack.load_from_dir(domain_dir)
        settings = PlatformSettings()
        settings.persistence.adapter = "postgres"
        settings.persistence.postgres_url = broken_dsn
        settings.persistence.postgres_schema = schema
        settings.llm.provider = "scripted"

        app = create_app(settings=settings, pack=pack)

        def mock_identity(request: httpx.Request) -> httpx.Response:
            auth = request.headers.get("Authorization", "")
            if auth == "Bearer token-alice":
                return httpx.Response(200, json={"data": {"id": "alice", "role": "CUSTOMER"}})
            if auth == "Bearer token-boss":
                return httpx.Response(200, json={"data": {"id": "boss", "role": "ADMIN"}})
            return httpx.Response(401)

        app.state.identity_transport = httpx.MockTransport(mock_identity)
        with TestClient(app, raise_server_exceptions=False) as client:
            r_chat = client.post(
                "/v1/chat",
                headers={"Authorization": "Bearer token-alice"},
                json={"query": "Xin chào 0912345678"},
            )
            assert r_chat.status_code == 503
            assert secret_pw not in r_chat.text
            assert "0912345678" not in r_chat.text

            r_hitl = client.get(
                "/v1/approvals",
                headers={"Authorization": "Bearer token-boss"},
            )
            assert r_hitl.status_code == 503
            assert secret_pw not in r_hitl.text

            r_resolve = client.post(
                "/api/hitl/review",
                headers={"Authorization": "Bearer token-boss"},
                json={"task_id": "app_1", "decision": "rejected"},
            )
            assert r_resolve.status_code == 503
            assert secret_pw not in r_resolve.text

        # Verify secret_pw never appeared in any log record
        for record in caplog.records:
            assert secret_pw not in record.getMessage()

    asyncio.run(_run())


# =============================================================================
# STEP 7C — Ownership, HITL Route Groups, Concurrent Reviewers & Locked Resume
# =============================================================================
def test_7c_hitl_ownership_concurrent_reviewers_and_restart(isolated_pg_env):
    """
    Tests against real PostgreSQL (`retailmind_agent_runtime`):
    1. Guest, Customer (`alice`, `bob`), Admin (`boss_1`, `boss_2`), forged token, spoofed reviewer.
    2. Both HITL route groups (`/v1/approvals*` and `/api/hitl*`).
    3. Restart between approval creation and resolution.
    4. Two concurrent reviewers (`boss_1` and `boss_2`) resolving the same approval:
       exactly ONE wins (`200 OK`) and the other gets `409 Conflict` (`already rejected`).
    5. Uncontrolled retry of `create_request` does NOT overwrite the resolved decision.
    6. HITL resume (`decision="approved"`) remains locked (`409 Conflict`).
    """
    runtime_dsn = isolated_pg_env["runtime_dsn"]
    schema = isolated_pg_env["schema"]
    domain_dir = Path(__file__).resolve().parents[2] / "domains" / "retail_store"
    pack = DomainPack.load_from_dir(domain_dir)

    def make_client() -> TestClient:
        settings = PlatformSettings()
        settings.persistence.adapter = "postgres"
        settings.persistence.postgres_url = runtime_dsn
        settings.persistence.postgres_schema = schema
        settings.llm.provider = "scripted"
        app = create_app(settings=settings, pack=pack)

        identities = {
            "Bearer tok-alice": ("synth_alice_7c", "CUSTOMER"),
            "Bearer tok-bob": ("synth_bob_7c", "CUSTOMER"),
            "Bearer tok-boss1": ("synth_boss_1", "ADMIN"),
            "Bearer tok-boss2": ("synth_boss_2", "ADMIN"),
        }

        def identity_handler(request: httpx.Request) -> httpx.Response:
            profile = identities.get(request.headers.get("Authorization", ""))
            if not profile:
                return httpx.Response(401, json={"error": "unauthorized"})
            return httpx.Response(200, json={"data": {"id": profile[0], "role": profile[1]}})

        app.state.identity_transport = httpx.MockTransport(identity_handler)
        return TestClient(app)

    approval_id_1 = f"task-hitl-7c1-{uuid.uuid4().hex[:6]}"
    approval_id_2 = f"task-hitl-7c2-{uuid.uuid4().hex[:6]}"

    # --- Instance 1: Create thread owned by Alice and two pending HITL approvals ---
    with make_client() as client_1:
        chat_res = client_1.post(
            "/v1/chat",
            headers={"Authorization": "Bearer tok-alice"},
            json={"query": "Xin chào, kiểm tra chính sách đổi trả"},
        )
        assert chat_res.status_code == 200
        alice_thread = chat_res.json()["thread_id"]

        store_1: ApprovalStore = client_1.app.state.harness.approval_store
        asyncio.run(
            store_1.create_request(
                thread_id=alice_thread,
                run_id="run_7c_1",
                tool_name="request_return_or_refund",
                arguments={"order_id": "ORD-100201", "amount": "500000", "phone": "0912345678"},
                approval_id=approval_id_1,
                requester_user_id="synth_alice_7c",
                requester_tenant_id="default",
            )
        )
        asyncio.run(
            store_1.create_request(
                thread_id=alice_thread,
                run_id="run_7c_2",
                tool_name="request_return_or_refund",
                arguments={"order_id": "ORD-100202", "amount": "600000"},
                approval_id=approval_id_2,
                requester_user_id="synth_alice_7c",
                requester_tenant_id="default",
            )
        )

    # --- Instance 2 (After Restart): Verify durability, RBAC, spoof guard, and concurrency ---
    with make_client() as client_2:
        # 1. Ownership persisted in PostgreSQL across restart:
        # Alice can continue her thread; Bob, Boss1, and Guest cannot!
        assert (
            client_2.post(
                "/v1/chat",
                headers={"Authorization": "Bearer tok-alice"},
                json={"query": "Tiếp tục hội thoại", "thread_id": alice_thread},
            ).status_code
            == 200
        )
        assert (
            client_2.post(
                "/v1/chat",
                headers={"Authorization": "Bearer tok-bob"},
                json={"query": "Thử chiếm phiên", "thread_id": alice_thread},
            ).status_code
            == 404
        )
        assert (
            client_2.post(
                "/api/chat",
                headers={"Authorization": "Bearer tok-boss1"},
                json={"query": "Admin thử chiếm phiên chat", "session_id": alice_thread},
            ).status_code
            == 404
        )
        assert (
            client_2.post(
                "/v1/chat",
                json={"query": "Guest thử chiếm phiên", "thread_id": alice_thread},
            ).status_code
            == 403
        )

        # 2. Forged/expired token rejected with 401
        for bad_hdr in ({"Authorization": "Bearer forged-token"}, {"Authorization": "Bearer dev:boss:admin"}):
            assert client_2.get("/v1/approvals", headers=bad_hdr).status_code == 401
            assert client_2.get("/api/hitl/queue", headers=bad_hdr).status_code == 401

        # 3. Customer & Guest rejected from HITL endpoints (403 / 401)
        assert client_2.get("/v1/approvals").status_code == 401
        assert client_2.get("/v1/approvals", headers={"Authorization": "Bearer tok-alice"}).status_code == 403
        assert client_2.get("/api/hitl/queue", headers={"Authorization": "Bearer tok-alice"}).status_code == 403

        # 4. Both HITL route groups return persisted pending approvals after restart (with masked PII)
        v1_list = client_2.get("/v1/approvals", headers={"Authorization": "Bearer tok-boss1"})
        assert v1_list.status_code == 200
        v1_ids = {item["approval_id"] for item in v1_list.json()}
        assert approval_id_1 in v1_ids and approval_id_2 in v1_ids
        assert "0912345678" not in v1_list.text

        api_queue = client_2.get("/api/hitl/queue", headers={"Authorization": "Bearer tok-boss1"})
        assert api_queue.status_code == 200
        api_ids = {item["task_id"] for item in api_queue.json()}
        assert approval_id_1 in api_ids and approval_id_2 in api_ids

        # 5. Spoofed reviewer rejected with 403
        spoof_resp = client_2.post(
            "/api/hitl/review",
            headers={"Authorization": "Bearer tok-boss1"},
            json={"task_id": approval_id_1, "decision": "rejected", "reviewer": "synth_boss_2"},
        )
        assert spoof_resp.status_code == 403

        # 6. HITL resume (`approved`) remains fail-closed (409) on both route groups
        for approve_path in (
            f"/v1/hitl/{approval_id_1}/approve",
            f"/api/hitl/{approval_id_1}/approve",
        ):
            res_app = client_2.post(approve_path, headers={"Authorization": "Bearer tok-boss1"})
            assert res_app.status_code == 409

        # 7. Concurrent two-reviewer resolution race on `approval_id_1` in PostgreSQL
        store_2: ApprovalStore = client_2.app.state.harness.approval_store

        async def _concurrent_resolve():
            barrier = asyncio.Event()

            async def _reviewer_call(admin_id: str, note_text: str):
                await barrier.wait()
                return await asyncio.to_thread(
                     lambda: asyncio.run(
                        store_2.resolve(
                            approval_id=approval_id_1,
                            decision="rejected",
                            approver_user_id=admin_id,
                            note=note_text,
                        )
                    )
                )

            t1 = asyncio.create_task(_reviewer_call("synth_boss_1", "Boss 1 từ chối"))
            t2 = asyncio.create_task(_reviewer_call("synth_boss_2", "Boss 2 từ chối"))
            barrier.set()
            return await asyncio.gather(t1, t2, return_exceptions=True)

        outcomes = asyncio.run(_concurrent_resolve())
        successes = [o for o in outcomes if not isinstance(o, Exception)]
        errors = [o for o in outcomes if isinstance(o, Exception)]
        assert len(successes) == 1, f"Expected exactly 1 winning reviewer, got: {outcomes}"
        assert len(errors) == 1
        assert isinstance(errors[0], ValueError)
        assert "already rejected" in str(errors[0])

        # Verify HTTP re-resolution returns 409 Conflict on both route groups
        dup_v1 = client_2.post(
            f"/v1/approvals/{approval_id_1}",
            headers={"Authorization": "Bearer tok-boss2"},
            json={"decision": "rejected", "note": "Thử ghi đè"},
        )
        assert dup_v1.status_code == 409

        dup_api = client_2.post(
            "/api/hitl/review",
            headers={"Authorization": "Bearer tok-boss2"},
            json={"task_id": approval_id_1, "decision": "rejected", "reason": "Thử ghi đè"},
        )
        assert dup_api.status_code == 409

        # 8. Uncontrolled retry of `create_request` must NOT overwrite the resolved decision
        retried_req = asyncio.run(
            store_2.create_request(
                thread_id=alice_thread,
                run_id="run_7c_1",
                tool_name="request_return_or_refund",
                arguments={"order_id": "ORD-100201", "amount": "500000"},
                approval_id=approval_id_1,
            )
        )
        assert retried_req.status == "rejected"
        assert retried_req.decision_by == successes[0].decision_by

        # 9. Resolve second approval via `/v1/hitl/{id}/reject`
        r2_resp = client_2.post(
            f"/v1/hitl/{approval_id_2}/reject",
            headers={"Authorization": "Bearer tok-boss2"},
            json={"decision": "rejected", "note": "Từ chối qua route v1"},
        )
        assert r2_resp.status_code == 200
        assert r2_resp.json()["status"] == "rejected"
        assert r2_resp.json()["decision_by"] == "synth_boss_2"


# =============================================================================
# STEP 7D — Side-Effect Tool Idempotency in PostgreSQL
# =============================================================================
class _OrderActionInput(BaseModel):
    order_id: str
    reason: str


def test_7d_side_effect_tool_idempotency_postgres(isolated_pg_env):
    """
    Tests PostgreSQL-backed `IdempotencyManager` + `ToolExecutor`:
    1. Same key + same payload (`completed`) -> returns cached output, executes side effect only ONCE.
    2. Restart between calls -> new `IdempotencyManager`/`ToolExecutor` instance loads from PostgreSQL
       and replays cached result without re-executing.
    3. Same key + different payload (or different principal) -> rejected with `idempotency_conflict`.
    4. Two concurrent calls with same key -> only 1 executes; the concurrent duplicate gets `idempotency_in_progress`.
    5. Pre-send failure / backend explicit rejection -> NOT cached as success; retry after recovery succeeds.
    6. Post-send timeout (`asyncio.TimeoutError` or `ctx.outcome_ambiguous=True`) -> marked `unknown_outcome`;
       subsequent retry with same key is blocked with `unknown_outcome` and does NOT re-execute!
    """
    async def _run():
        runtime_dsn = isolated_pg_env["runtime_dsn"]
        schema = isolated_pg_env["schema"]

        call_counter = {"count": 0}
        behavior = {"mode": "ok"}
        in_flight_gate = asyncio.Event()

        @tool(
            name="synth_mutate_order",
            description="Synthetic side-effect tool for idempotency verification",
            input_model=_OrderActionInput,
            side_effect=True,
            allowed_roles=["customer", "admin"],
            timeout_s=0.3,
        )
        async def synth_mutate_order(args: _OrderActionInput, ctx: ToolContext) -> Dict[str, Any]:
            mode = behavior["mode"]
            if mode == "pre_send_error":
                # Simulates connect failure before sending or explicit 500 error from backend
                raise ToolUnavailableError("Không thể kết nối tới dịch vụ đơn hàng.")
            if mode == "post_send_read_timeout":
                # Simulates ReadTimeout after sending payload to backend
                ctx.outcome_ambiguous = True
                call_counter["count"] += 1
                raise ToolUnavailableError("Không thể xác nhận kết quả thao tác sau khi gửi yêu cầu.")
            if mode == "hang_timeout":
                call_counter["count"] += 1
                await asyncio.sleep(2.0)
                return {"status": "late"}
            if mode == "slow_concurrent":
                call_counter["count"] += 1
                await in_flight_gate.wait()
                return {"status": "confirmed", "order_id": args.order_id, "idem_key": ctx.idempotency_key}

            call_counter["count"] += 1
            return {
                "status": "confirmed",
                "order_id": args.order_id,
                "reason": args.reason,
                "idem_key": ctx.idempotency_key,
            }

        def make_executor() -> ToolExecutor:
            reg = ToolRegistry()
            reg.register(synth_mutate_order)
            idem = IdempotencyManager(dsn=runtime_dsn, schema=schema, adapter="postgres")
            aud = TamperEvidentHashChainLedger(dsn=runtime_dsn, schema=schema, adapter="postgres")
            return ToolExecutor(
                registry=reg,
                policy_engine=PolicyEngine({}),
                audit_ledger=aud,
                idempotency_manager=idem,
            )

        alice = Principal(user_id="synth_alice_7d", role="customer", tenant_id="default")
        bob = Principal(user_id="synth_bob_7d", role="customer", tenant_id="default")

        # --- Case 1 & 2: Same key + same payload + restart between calls ---
        exec_1 = make_executor()
        res_1 = await exec_1.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-01", "reason": "Đổi địa chỉ giao hàng 0912345678"},
            alice,
            thread_id="thread_7d_1",
            call_id="call_7d_1",
        )
        assert not res_1.is_error
        assert call_counter["count"] == 1
        assert "0912345678" not in res_1.output

        # Verify raw PII was not stored in `tool_idempotency` table
        idem_key_1 = exec_1.idempotency.generate_key("thread_7d_1", "call_7d_1")
        rec_1 = exec_1.idempotency.get_record(idem_key_1)
        assert rec_1 is not None
        assert rec_1["status"] == "completed"
        assert "0912345678" not in (rec_1["response_output"] or "")

        # Simulate process restart: create brand new `exec_2` connected to PostgreSQL
        exec_2 = make_executor()
        res_replay = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-01", "reason": "Đổi địa chỉ giao hàng 0912345678"},
            alice,
            thread_id="thread_7d_1",
            call_id="call_7d_1",
        )
        assert not res_replay.is_error
        assert res_replay.output == res_1.output
        assert call_counter["count"] == 1  # Side effect was NOT re-executed after restart!

        # --- Case 3: Same key, different payload or different principal -> conflict ---
        res_diff_payload = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-999", "reason": "Payload khác"},
            alice,
            thread_id="thread_7d_1",
            call_id="call_7d_1",
        )
        assert res_diff_payload.is_error
        assert res_diff_payload.error_code == "idempotency_conflict"
        assert call_counter["count"] == 1

        res_diff_principal = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-01", "reason": "Đổi địa chỉ giao hàng 0912345678"},
            bob,
            thread_id="thread_7d_1",
            call_id="call_7d_1",
        )
        assert res_diff_principal.is_error
        assert res_diff_principal.error_code == "idempotency_conflict"
        assert call_counter["count"] == 1

        # --- Case 4: Two concurrent requests with the same key (`in_progress`) ---
        behavior["mode"] = "slow_concurrent"
        in_flight_gate.clear()

        task_first = asyncio.create_task(
            exec_2.execute(
                "synth_mutate_order",
                {"order_id": "ORD-7D-CONC", "reason": "Concurrent test"},
                alice,
                thread_id="thread_7d_conc",
                call_id="call_7d_conc",
            )
        )
        await asyncio.sleep(0.05)  # Let first call acquire `in_progress` row in PostgreSQL

        res_second_concurrent = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-CONC", "reason": "Concurrent test"},
            alice,
            thread_id="thread_7d_conc",
            call_id="call_7d_conc",
        )
        assert res_second_concurrent.is_error
        assert res_second_concurrent.error_code == "idempotency_in_progress"

        in_flight_gate.set()
        res_first_done = await task_first
        assert not res_first_done.is_error
        assert call_counter["count"] == 2  # Only 1 execution for the concurrent pair!

        # --- Case 5: Pre-send error / explicit backend error is NOT cached as success and allows retry ---
        behavior["mode"] = "pre_send_error"
        res_pre_err = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-RETRY", "reason": "Retryable pre-send failure"},
            alice,
            thread_id="thread_7d_retry",
            call_id="call_7d_retry",
        )
        assert res_pre_err.is_error
        assert res_pre_err.error_code == "unavailable"
        assert call_counter["count"] == 2

        # Now backend recovers -> retry with same key succeeds!
        behavior["mode"] = "ok"
        res_retry_ok = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-RETRY", "reason": "Retryable pre-send failure"},
            alice,
            thread_id="thread_7d_retry",
            call_id="call_7d_retry",
        )
        assert not res_retry_ok.is_error
        assert call_counter["count"] == 3

        # --- Case 6A: Post-send ReadTimeout marks `unknown_outcome` and blocks blind retry ---
        behavior["mode"] = "post_send_read_timeout"
        res_ambig = await exec_2.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-AMBIG", "reason": "Dropped after send"},
            alice,
            thread_id="thread_7d_ambig",
            call_id="call_7d_ambig",
        )
        assert res_ambig.is_error
        assert res_ambig.error_code == "unknown_outcome"
        assert call_counter["count"] == 4

        # Even if backend mode is now "ok" and process restarts, retrying the same key is BLOCKED!
        behavior["mode"] = "ok"
        exec_3 = make_executor()
        res_ambig_retry = await exec_3.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-AMBIG", "reason": "Dropped after send"},
            alice,
            thread_id="thread_7d_ambig",
            call_id="call_7d_ambig",
        )
        assert res_ambig_retry.is_error
        assert res_ambig_retry.error_code == "unknown_outcome"
        assert call_counter["count"] == 4  # Side effect was NOT re-run!

        # --- Case 6B: asyncio.TimeoutError also marks `unknown_outcome` and blocks blind retry ---
        behavior["mode"] = "hang_timeout"
        res_to = await exec_3.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-TO", "reason": "Timeout during execution"},
            alice,
            thread_id="thread_7d_to",
            call_id="call_7d_to",
        )
        assert res_to.is_error
        assert res_to.error_code == "unknown_outcome"
        assert call_counter["count"] == 5

        behavior["mode"] = "ok"
        res_to_retry = await exec_3.execute(
            "synth_mutate_order",
            {"order_id": "ORD-7D-TO", "reason": "Timeout during execution"},
            alice,
            thread_id="thread_7d_to",
            call_id="call_7d_to",
        )
        assert res_to_retry.is_error
        assert res_to_retry.error_code == "unknown_outcome"
        assert call_counter["count"] == 5

    asyncio.run(_run())


# =============================================================================
# STEP 7E — Durable Audit Ledger & Hash-Chain Integrity Across Restarts
# =============================================================================
def test_7e_durable_audit_ledger_pii_masking_and_integrity_across_restart(isolated_pg_env):
    """
    Verifies that `TamperEvidentHashChainLedger`:
    1. Persists audit events to PostgreSQL (`{schema}.audit_events`) with mandatory PII masking.
    2. Maintains cryptographic SHA-256 hash chaining across process restarts.
    3. Detects any tampering with event fields (`verify_integrity() == False`).
    """
    runtime_dsn = isolated_pg_env["runtime_dsn"]
    schema = isolated_pg_env["schema"]
    thread_id = f"thread_audit_7e_{uuid.uuid4().hex[:8]}"

    # Instance 1: Record two events containing raw Vietnamese PII
    ledger_1 = TamperEvidentHashChainLedger(
        dsn=runtime_dsn,
        schema=schema,
        adapter="postgres",
    )
    ev1 = ledger_1.record_event(
        event_id=f"aud_7e_1_{uuid.uuid4().hex[:6]}",
        thread_id=thread_id,
        user_id="synth_alice_7e",
        role="customer",
        tenant_id="default",
        tool_name="create_support_ticket",
        input_masked={
            "phone": "0912345678",
            "cccd": "079123456789",
            "email": "khachhang@mwg.vn",
        },
        decision="executed",
    )
    assert "0912345678" not in json.dumps(ev1.input_masked)
    assert "079123456789" not in json.dumps(ev1.input_masked)
    assert "khachhang@mwg.vn" not in json.dumps(ev1.input_masked)
    del ledger_1

    # Instance 2 (Simulating Restart): Append third event and verify full chain integrity
    ledger_2 = TamperEvidentHashChainLedger(
        dsn=runtime_dsn,
        schema=schema,
        adapter="postgres",
    )
    ev2 = ledger_2.record_event(
        event_id=f"aud_7e_2_{uuid.uuid4().hex[:6]}",
        thread_id=thread_id,
        user_id="synth_boss_7e",
        role="admin",
        tenant_id="default",
        tool_name="request_return_or_refund",
        input_masked={"approval_id": "app_1", "decision": "rejected"},
        decision="hitl_rejected",
        approver="synth_boss_7e",
    )
    assert ev2.prev_hash == ev1.current_hash

    all_events = ledger_2.get_events()
    assert len(all_events) >= 2
    assert ledger_2.verify_integrity(all_events) is True

    # Simulate tampering on a loaded copy -> verify_integrity must return False
    all_events[-1].decision = "forged_approved"
    assert ledger_2.verify_integrity(all_events) is False
