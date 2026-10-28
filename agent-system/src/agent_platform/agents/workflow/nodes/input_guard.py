from langchain_core.messages import HumanMessage
from agent_platform.harness.state.contracts import AgentState
from agent_platform.harness.guards.sanitizer import InputSanitizer
from agent_platform.harness.guards.injection import PromptInjectionDetector

def input_guard_node(state: AgentState) -> dict:
    """Validates and sanitizes the user query before processing."""
    messages = state.get("messages", [])
    if not messages:
        return {}

    last_msg = messages[-1]
    raw_content = last_msg.content if isinstance(last_msg.content, str) else str(last_msg.content)

    sanitized = InputSanitizer.sanitize(raw_content)

    if PromptInjectionDetector.is_injection(sanitized):
        return {
            "status": "abstained",
            "final_answer": "Yêu cầu của bạn bị từ chối do vi phạm quy chuẩn an toàn bảo mật hệ thống.",
        }

    return {}
