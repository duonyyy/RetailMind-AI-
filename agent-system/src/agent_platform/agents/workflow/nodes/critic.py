"""Conservative quote matching; this is not a semantic faithfulness metric."""
import re
import unicodedata

from agent_platform.harness.state.contracts import AgentState


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text).casefold()).strip()


def critic_node(state: AgentState) -> dict:
    answer = (state.get("final_answer") or "").strip()
    normalized = _normalize(answer)
    cycles = state.get("critic_cycles", 0) + 1
    # Only fixed, non-factual greetings bypass source verification.
    if normalized.rstrip("!. ") in {"xin chào", "chào bạn", "xin chào bạn", "cảm ơn", "cảm ơn bạn"}:
        return {"critic_cycles": cycles, "grounding_score": None, "grounding_status": "not_applicable", "matched_evidence": [], "critic_feedback": None}

    commerce_answer = state.get("verified_commerce_answer")
    if commerce_answer and normalized == _normalize(commerce_answer):
        return {"critic_cycles": cycles, "grounding_score": None, "grounding_status": "verified_commerce", "matched_evidence": [], "critic_feedback": None}

    matched = [
        ev for ev in state.get("evidence", [])
        if ev.source_verified and ev.document_version_id and ev.chunk_id and ev.source_document
        and len(normalized) >= 10 and normalized == _normalize(ev.content_snippet)
    ]
    if matched:
        return {"critic_cycles": cycles, "grounding_score": None, "grounding_status": "exact_quote", "matched_evidence": matched, "critic_feedback": None}
    return {
        "critic_cycles": cycles,
        "grounding_score": None,
        "grounding_status": "unverified",
        "matched_evidence": [],
        "critic_feedback": "Chưa xác minh được câu trả lời với đoạn trích và phiên bản tài liệu đáng tin cậy. Hãy tra cứu nguồn; chỉ trả lời khi có căn cứ.",
    }
