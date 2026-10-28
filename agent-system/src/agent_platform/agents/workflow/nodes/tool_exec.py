import json
import time
from typing import List, Dict, Any
from langchain_core.messages import ToolMessage
from agent_platform.harness.state.contracts import AgentState, Evidence, ToolEvent
from agent_platform.harness.tools.executor import ToolExecutor

def create_tool_exec_node(executor: ToolExecutor):
    """Factory creating the tool execution node."""

    async def tool_exec_node(state: AgentState) -> dict:
        pending_calls = state.get("pending_tool_calls", [])
        if not pending_calls:
            return {}

        principal = state["principal"]
        thread_id = state.get("thread_id", "thread_default")
        run_id = state.get("run_id", "run_default")

        tool_messages: List[ToolMessage] = []
        events: List[ToolEvent] = []
        new_evidence: List[Evidence] = []
        awaiting_approval = False
        unavailable_message = None

        for tc in pending_calls:
            t_start = time.time()
            tool_name = tc.get("name", "")
            args = tc.get("arguments", {})
            call_id = tc.get("id", f"call_{len(tool_messages)}")

            result = await executor.execute(
                tool_name=tool_name,
                arguments=args,
                principal=principal,
                thread_id=thread_id,
                call_id=call_id,
                run_id=run_id,
            )

            duration_ms = (time.time() - t_start) * 1000

            if result.requires_approval:
                awaiting_approval = True

            tool_msg = ToolMessage(
                content=str(result.output),
                tool_call_id=call_id,
                name=tool_name,
            )
            tool_messages.append(tool_msg)

            events.append(ToolEvent(
                tool_name=tool_name,
                call_id=call_id,
                arguments=args,
                output=str(result.output)[:500],
                is_error=result.is_error,
                execution_time_ms=duration_ms,
            ))

            if result.error_code in ("unavailable", "timeout"):
                unavailable_message = str(result.output)
                break

            # Extract evidence if read-only lookup or knowledge retrieval
            spec = executor.registry.get(tool_name)
            is_lookup = (spec and not spec.side_effect) or tool_name == "search_knowledge"
            if is_lookup and not result.is_error:
                new_evidence.append(Evidence(
                    chunk_id=f"ev_{call_id}",
                    source_document=tool_name if tool_name != "search_knowledge" else "knowledge_store",
                    content_snippet=str(result.output)[:400],
                    score=1.0,
                ))

        updates: Dict[str, Any] = {
            "messages": tool_messages,
            "pending_tool_calls": [],
            "tool_events": events,
            "evidence": new_evidence,
        }

        if unavailable_message:
            updates["status"] = "abstained"
            updates["final_answer"] = unavailable_message
        elif awaiting_approval:
            updates["status"] = "awaiting_approval"

        return updates

    return tool_exec_node
