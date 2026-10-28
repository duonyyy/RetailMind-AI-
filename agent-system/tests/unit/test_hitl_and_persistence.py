import asyncio
import os
import time
from pathlib import Path
import pytest
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage
from agent_platform.harness.persistence.memory.adapter import MemoryKVStore
from agent_platform.harness.persistence.sqlite.adapter import SqliteKVStore
from agent_platform.harness.hitl.approval_store import ApprovalStore
from agent_platform.harness.state.principal import Principal
from agent_platform.domain.pack import DomainPack
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.agents.workflow.builder import build_agent_graph

def test_memory_kv_store_operations():
    async def _run():
        store = MemoryKVStore()
        await store.set("user:123", {"name": "Alice"})
        assert await store.get("user:123") == {"name": "Alice"}

        # Test TTL
        await store.set("temp_key", "temporary_val", ttl_seconds=0.1)
        assert await store.get("temp_key") == "temporary_val"
        await asyncio.sleep(0.15)
        assert await store.get("temp_key") is None

        # Test delete
        await store.set("del_key", "val")
        assert await store.delete("del_key") is True
        assert await store.get("del_key") is None

    asyncio.run(_run())

def test_sqlite_kv_store_operations(tmp_path):
    async def _run():
        db_file = tmp_path / "test_store.db"
        store = SqliteKVStore(db_path=str(db_file))

        await store.set("app_config", {"mode": "enterprise"})
        val = await store.get("app_config")
        assert val == {"mode": "enterprise"}

        keys = await store.list_keys()
        assert "app_config" in keys

        assert await store.delete("app_config") is True
        assert await store.get("app_config") is None

    asyncio.run(_run())

def test_approval_store_workflow():
    async def _run():
        kv = MemoryKVStore()
        store = ApprovalStore(kv)

        # Create request
        req = await store.create_request(
            thread_id="th_555",
            run_id="run_777",
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "500000"},
            approver_role="admin",
        )
        assert req.status == "pending"
        assert req.tool_name == "request_refund"

        # List pending
        pending = await store.list_pending()
        assert len(pending) == 1
        assert pending[0].approval_id == req.approval_id

        # Resolve approve
        resolved = await store.resolve(
            approval_id=req.approval_id,
            decision="approved",
            approver_user_id="manager_dan",
            note="Đã kiểm tra hóa đơn hợp lệ.",
        )
        assert resolved.status == "approved"
        assert resolved.decision_by == "manager_dan"

        # Verify not in pending anymore
        pending_after = await store.list_pending()
        assert len(pending_after) == 0

        # Cannot resolve twice
        with pytest.raises(ValueError, match="already approved"):
            await store.resolve(req.approval_id, "rejected", "admin_2")

    asyncio.run(_run())

def test_langgraph_durable_checkpointer_integration():
    """Tests that LangGraph checkpointer persists execution state across thread invocations."""
    async def _run():
        checkpointer = MemorySaver()
        domain_dir = Path(__file__).parents[2] / "domains" / "retail_store"
        pack = DomainPack.load_from_dir(domain_dir)

        from agent_platform.harness.tools.builtin.search_knowledge import search_knowledge
        registry = ToolRegistry()
        registry.register(search_knowledge)
        policy_engine = PolicyEngine.load_from_file(domain_dir / "policies.yaml")
        executor = ToolExecutor(registry, policy_engine)

        llm = ScriptedLLM()
        llm.queue_tool_call("search_knowledge", {"query": "chào hỏi"}, call_id="call_hi")
        llm.queue_answer("Xin chào, tôi có thể hỗ trợ gì cho bạn?")

        graph = build_agent_graph(pack, llm, registry, executor, checkpointer=checkpointer)

        thread_id = "test_durable_thread_1"
        config = {"configurable": {"thread_id": thread_id}}

        initial_state = {
            "thread_id": thread_id,
            "run_id": "run_01",
            "principal": Principal(user_id="user_1", role="customer"),
            "domain": "retail_store",
            "prompt_version": "v1",
            "messages": [HumanMessage(content="Xin chào")],
            "step_count": 0,
            "critic_cycles": 0,
            "critic_feedback": None,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        # Step 1: Run graph
        res = await graph.ainvoke(initial_state, config=config)
        assert res["status"] == "done"

        # Step 2: Retrieve checkpoint directly from memory checkpointer
        checkpoint = await checkpointer.aget(config)
        assert checkpoint is not None
        assert "channel_values" in checkpoint

    asyncio.run(_run())
