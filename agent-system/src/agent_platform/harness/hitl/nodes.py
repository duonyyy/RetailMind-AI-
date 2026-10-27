from typing import Dict, Any
from langgraph.types import interrupt
from agent_platform.harness.state.contracts import AgentState

def hitl_interrupt_node(state: AgentState) -> dict:
    """
    Suspends graph execution using native LangGraph interrupt() mechanism.
    Fixes A5: Integrates with durable checkpointer so session can be resumed.
    """
    pending_tool_calls = state.get("pending_tool_calls", [])
    if not pending_tool_calls:
        return {}

    first_call = pending_tool_calls[0]

    interrupt_payload = {
        "thread_id": state.get("thread_id"),
        "run_id": state.get("run_id"),
        "tool_name": first_call.get("name"),
        "arguments": first_call.get("arguments"),
        "message": "Yêu cầu phê duyệt hành động nhạy cảm từ người có thẩm quyền.",
    }

    # LangGraph interrupt raises a graph suspension event
    human_decision = interrupt(interrupt_payload)

    # When resumed via Command(resume={...}), human_decision receives the payload
    is_approved = human_decision.get("approved", False) if isinstance(human_decision, dict) else bool(human_decision)

    if not is_approved:
        return {
            "status": "abstained",
            "final_answer": "Thao tác đã bị người có thẩm quyền từ chối phê duyệt.",
            "pending_tool_calls": [],
        }

    return {"status": "running"}
