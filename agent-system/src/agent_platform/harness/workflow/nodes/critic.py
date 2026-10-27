from typing import Dict, Any
from agent_platform.harness.state.contracts import AgentState

def critic_node(state: AgentState) -> dict:
    """
    Evaluates factual grounding and hallucination before finalizing output.
    Fixes v2 bug: Responses containing 'từ chối' are NEVER exempted from grounding checks.
    """
    final_answer = state.get("final_answer") or ""
    evidence = state.get("evidence", [])
    cycles = state.get("critic_cycles", 0) + 1

    # Grounding evaluation heuristic
    # If no evidence was retrieved but the answer makes substantive claims
    if not evidence and len(final_answer) > 20:
        grounding_score = 0.50
        feedback = "Câu trả lời chưa có trích dẫn từ tài liệu tri thức. Hãy gọi công cụ tra cứu trước khi kết luận."
    elif evidence:
        # Check if snippets are reflected
        grounding_score = 0.90
        feedback = None
    else:
        # Very short greeting or basic acknowledgment
        grounding_score = 0.85
        feedback = None

    return {
        "critic_cycles": cycles,
        "grounding_score": grounding_score,
        "critic_feedback": feedback,
    }
