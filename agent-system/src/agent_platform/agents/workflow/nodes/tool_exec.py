import json
import time
from typing import List, Dict, Any
from langchain_core.messages import ToolMessage
from agent_platform.harness.state.contracts import AgentState, Evidence, ToolEvent
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.guards.pii import PIIMasker

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
        approval_call = None

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
                # Preserve only the reviewable, non-PII subset. This is not an
                # executable payload; the original tool input is not retained here.
                approval_call = {
                    "name": tool_name,
                    "id": call_id,
                    "arguments": {k: str(args[k]) for k in ("order_id", "amount") if k in args},
                    "rule": result.approval_metadata.get("rule"),
                }

            # ToolExecutor already produced masked output in wrapped_output
            masked_output_str = str(result.output)

            tool_msg = ToolMessage(
                content=masked_output_str,
                tool_call_id=call_id,
                name=tool_name,
            )
            tool_messages.append(tool_msg)

            # Mask arguments and output stored in ToolEvent
            events.append(ToolEvent(
                tool_name=tool_name,
                call_id=call_id,
                arguments={} if result.requires_approval else PIIMasker.mask(args, fail_closed=False),
                output=masked_output_str[:500],
                is_error=result.is_error,
                execution_time_ms=duration_ms,
            ))

            if awaiting_approval:
                break

            if result.error_code in ("unavailable", "timeout", "sensitive_input_unavailable"):
                unavailable_message = masked_output_str
                break

            # Tool output alone is not a verified document version or a citation.
            # A future retrieval adapter must attach server-verified provenance.

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
            updates["approval_call"] = approval_call

        return updates

    return tool_exec_node
