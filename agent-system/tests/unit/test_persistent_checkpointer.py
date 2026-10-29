import asyncio
import os
import pytest
from pathlib import Path

from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.harness import AgentHarness
from agent_platform.harness.persistence.checkpointer import (
    PersistentCheckpointer,
    create_checkpointer,
)
from agent_platform.harness.persistence.ports import PersistenceError
from agent_platform.harness.state.principal import Principal
from langgraph.checkpoint.base import Checkpoint, CheckpointMetadata
from langgraph.checkpoint.memory import MemorySaver


@pytest.fixture
def mock_pack():
    return DomainPack(
        name="retail_store",
        version="1.0.0",
        description="Retail Store Mock Pack",
        tools_path=Path("domains/retail_store/tools.py"),
    )


def test_memory_adapter_checkpointer():
    async def _run():
        settings = PlatformSettings()
        settings.persistence.adapter = "memory"

        checkpointer = create_checkpointer(settings)
        assert isinstance(checkpointer, PersistentCheckpointer)
        assert checkpointer.adapter_type == "memory"

        config = {"configurable": {"thread_id": "thread_mem_1", "checkpoint_ns": ""}}
        checkpoint: Checkpoint = {
            "v": 1,
            "ts": "2026-10-28T12:00:00Z",
            "id": "chk_1",
            "channel_values": {"status": "ok", "value": 42},
            "channel_versions": {"status": 1, "value": 1},
            "versions_seen": {},
            "pending_sends": [],
        }
        metadata: CheckpointMetadata = {"source": "input", "step": 1, "writes": {}, "score": 1}

        saved_config = await checkpointer.aput(config, checkpoint, metadata, {"status": 1, "value": 1})
        assert saved_config is not None

        tuple_res = await checkpointer.aget_tuple(config)
        assert tuple_res is not None
        assert tuple_res.checkpoint["channel_values"]["value"] == 42
        assert tuple_res.checkpoint["channel_values"]["status"] == "ok"

    asyncio.run(_run())


def test_sqlite_adapter_checkpointer_persistence(tmp_path):
    async def _run():
        sqlite_file = str(tmp_path / "test_checkpoints.db")
        settings = PlatformSettings()
        settings.persistence.adapter = "sqlite"
        settings.persistence.sqlite_path = sqlite_file

        checkpointer = create_checkpointer(settings)
        assert checkpointer.adapter_type == "sqlite"

        config = {"configurable": {"thread_id": "thread_sql_1", "checkpoint_ns": ""}}
        checkpoint: Checkpoint = {
            "v": 1,
            "ts": "2026-10-28T12:00:00Z",
            "id": "chk_sqlite_1",
            "channel_values": {"step": "tool_executed", "cart_id": "cart_99"},
            "channel_versions": {"step": 1, "cart_id": 1},
            "versions_seen": {},
            "pending_sends": [],
        }
        metadata: CheckpointMetadata = {"source": "tool", "step": 2, "writes": {}, "score": 1}

        await checkpointer.aput(config, checkpoint, metadata, {"step": 1, "cart_id": 1})
        await checkpointer.aclose()

        # Re-open with a brand new checkpointer instance pointing to the same SQLite file
        reopened = create_checkpointer(settings)
        tuple_res = await reopened.aget_tuple(config)
        assert tuple_res is not None
        assert tuple_res.checkpoint["channel_values"]["cart_id"] == "cart_99"
        await reopened.aclose()

    asyncio.run(_run())


def test_postgres_adapter_resilient_fallback():
    """PostgreSQL adapter must fail-closed (never fall back to MemorySaver) on both async and sync paths."""
    async def _run():
        settings = PlatformSettings()
        settings.persistence.adapter = "postgres"
        settings.persistence.postgres_url = "postgresql://invalid_user:super_secret_pw_99@127.0.0.1:59999/nonexistent"

        checkpointer = create_checkpointer(settings)
        assert checkpointer.adapter_type == "postgres"

        config = {"configurable": {"thread_id": "thread_pg_fb", "checkpoint_ns": ""}}
        checkpoint: Checkpoint = {
            "v": 1,
            "ts": "2026-10-28T12:00:00Z",
            "id": "chk_pg_1",
            "channel_values": {"resilient": True},
            "channel_versions": {"resilient": 1},
            "versions_seen": {},
            "pending_sends": [],
        }
        metadata: CheckpointMetadata = {"source": "input", "step": 1, "writes": {}, "score": 1}

        with pytest.raises(PersistenceError) as exc_info:
            await checkpointer.aput(config, checkpoint, metadata, {"resilient": 1})
        assert "super_secret_pw_99" not in str(exc_info.value)
        assert not isinstance(checkpointer._target, MemorySaver)

        with pytest.raises(PersistenceError) as sync_exc_info:
            checkpointer.put(config, checkpoint, metadata, {"resilient": 1})
        assert "super_secret_pw_99" not in str(sync_exc_info.value)
        assert not isinstance(checkpointer._target, MemorySaver)
        await checkpointer.aclose()

    asyncio.run(_run())


def test_redis_adapter_resilient_fallback():
    """Redis adapter must fail-closed (never fall back to MemorySaver) when unreachable."""
    async def _run():
        settings = PlatformSettings()
        settings.persistence.adapter = "redis"
        settings.persistence.redis_url = "redis://127.0.0.1:59999/0"

        checkpointer = create_checkpointer(settings)
        assert checkpointer.adapter_type == "redis"

        config = {"configurable": {"thread_id": "thread_redis_fb", "checkpoint_ns": ""}}
        checkpoint: Checkpoint = {
            "v": 1,
            "ts": "2026-10-28T12:00:00Z",
            "id": "chk_redis_1",
            "channel_values": {"redis_fallback": True},
            "channel_versions": {"redis_fallback": 1},
            "versions_seen": {},
            "pending_sends": [],
        }
        metadata: CheckpointMetadata = {"source": "input", "step": 1, "writes": {}, "score": 1}

        with pytest.raises(PersistenceError):
            await checkpointer.aput(config, checkpoint, metadata, {"redis_fallback": 1})
        assert not isinstance(checkpointer._target, MemorySaver)
        await checkpointer.aclose()

    asyncio.run(_run())


def test_agent_harness_integration_with_persistent_checkpointer(tmp_path, mock_pack):
    async def _run():
        sqlite_file = str(tmp_path / "harness_checkpoints.db")
        settings = PlatformSettings()
        settings.persistence.adapter = "sqlite"
        settings.persistence.sqlite_path = sqlite_file
        settings.llm.provider = "mock"

        harness = AgentHarness(settings=settings, pack=mock_pack)
        assert isinstance(harness.checkpointer, PersistentCheckpointer)

        principal = Principal(
            user_id="customer_101",
            role="customer",
            tenant_id="retail_store",
            permissions=["read", "write"],
        )

        state = await harness.execute(
            query="Kiểm tra trạng thái đơn hàng ORD-100201",
            principal=principal,
            thread_id="persistent_thread_101",
        )

        assert state is not None
        assert state.get("thread_id") == "persistent_thread_101"

        # Checkpoint was persisted into SQLite
        cp_tuple = await harness.checkpointer.aget_tuple(
            {"configurable": {"thread_id": "persistent_thread_101", "checkpoint_ns": ""}}
        )
        assert cp_tuple is not None
        await harness.aclose()

    asyncio.run(_run())
