from agent_platform.harness.state.contracts import AgentState

def finalize_node(state: AgentState) -> dict:
    """Finalizes verified output and formats citations."""
    final_answer = state.get("final_answer") or ""
    evidence = state.get("matched_evidence", [])

    if evidence and "Nguồn trích dẫn:" not in final_answer:
        sources = list(dict.fromkeys(ev.source_document for ev in evidence))
        citation_str = "\n\n**Nguồn trích dẫn:** " + ", ".join(sources)
        final_answer += citation_str

    return {
        "final_answer": final_answer,
        "status": "done",
    }
