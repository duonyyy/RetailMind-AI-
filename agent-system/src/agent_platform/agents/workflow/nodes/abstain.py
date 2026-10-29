from agent_platform.harness.state.contracts import AgentState

def abstain_node(state: AgentState) -> dict:
    """Safe refusal node invoked when safety gates or loop limits trip."""
    answer = state.get("final_answer")
    if state.get("grounding_status") == "unverified" and state.get("status") != "abstained":
        answer = "Tôi chưa có đủ tài liệu đáng tin cậy để xác minh câu trả lời. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
    elif not answer:
        answer = "Hệ thống xin phép từ chối cung cấp câu trả lời do không đủ căn cứ đối soát tin cậy hoặc vượt quá giới hạn suy luận."

    return {
        "final_answer": answer,
        "status": "abstained",
    }
