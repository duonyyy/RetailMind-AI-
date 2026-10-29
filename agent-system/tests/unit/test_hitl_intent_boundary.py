"""Tests the workflow boundary, without claiming a live backend execution."""
import asyncio

from agent_platform.agents.workflow.nodes.tool_exec import create_tool_exec_node
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutionResult
from agent_platform.harness.hitl.approval_store import ApprovalStore
from agent_platform.harness.persistence.memory.adapter import MemoryKVStore


def test_approval_stops_following_calls_and_retains_only_review_subset():
    class Executor:
        def __init__(self):
            self.calls = []

        async def execute(self, **kwargs):
            self.calls.append(kwargs["tool_name"])
            return ToolExecutionResult(requires_approval=True, approval_metadata={"rule": "refund_threshold"})

    executor = Executor()
    node = create_tool_exec_node(executor)
    result = asyncio.run(node({
        "principal": Principal(user_id="alice", role="customer"),
        "thread_id": "t", "run_id": "r",
        "pending_tool_calls": [
            {"name": "request_return_or_refund", "id": "call1", "arguments": {
                "order_id": "ORD-100201", "amount": "500000", "reason": "call 0912345678", "customer_name": "Private Name"}},
            {"name": "second_side_effect", "id": "call2", "arguments": {}},
        ],
    }))
    assert executor.calls == ["request_return_or_refund"]
    assert result["status"] == "awaiting_approval"
    assert result["approval_call"]["arguments"] == {"order_id": "ORD-100201", "amount": "500000"}
    assert "0912345678" not in str(result)
    assert "Private Name" not in str(result)


def test_two_reviewers_cannot_both_resolve_one_request():
    async def run():
        store = ApprovalStore(MemoryKVStore())
        request = await store.create_request("t", "r", "request_return_or_refund", {})
        outcomes = await asyncio.gather(
            store.resolve(request.approval_id, "rejected", "reviewer1"),
            store.resolve(request.approval_id, "rejected", "reviewer2"),
            return_exceptions=True,
        )
        assert sum(isinstance(value, ValueError) for value in outcomes) == 1
        assert (await store.get_request(request.approval_id)).decision_by in {"reviewer1", "reviewer2"}
    asyncio.run(run())
