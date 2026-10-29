import asyncio

from agent_platform.agents.workflow.nodes.abstain import abstain_node
from agent_platform.agents.workflow.nodes.critic import critic_node
from agent_platform.agents.workflow.nodes.finalize import finalize_node
from agent_platform.harness.state.contracts import Evidence
from agent_platform.harness.tools.builtin.search_knowledge import search_knowledge, SearchKnowledgeInput
from agent_platform.harness.tools.spec import ToolContext, ToolUnavailableError
from agent_platform.harness.state.principal import Principal


def evidence(**overrides):
    values = dict(chunk_id="chunk-1", source_document="policy.pdf", document_version_id="version-1",
                  content_snippet="Khách hàng được đổi trả trong 14 ngày.", source_verified=True)
    return Evidence(**(values | overrides))


def test_verified_exact_quote_has_provenance_but_no_numeric_score():
    result = critic_node({"final_answer": "Khách hàng được đổi trả trong 14 ngày.", "evidence": [evidence()]})
    assert result["grounding_status"] == "exact_quote"
    assert result["grounding_score"] is None
    assert result["matched_evidence"][0].document_version_id == "version-1"
    assert "policy.pdf" in finalize_node({"final_answer": "Khách hàng được đổi trả trong 14 ngày.", **result})["final_answer"]


def test_contradiction_unrelated_or_unverified_source_does_not_pass():
    for answer, docs in [
        ("Khách hàng được đổi trả trong 30 ngày.", [evidence()]),
        ("Khách hàng không được đổi trả trong 14 ngày.", [evidence()]),
        ("được đổi trả trong 14 ngày.", [evidence(content_snippet="Khách hàng không được đổi trả trong 14 ngày.")]),
        ("Khách hàng được đổi trả trong 14 ngày.", [evidence(source_verified=False)]),
        ("Khách hàng được đổi trả trong 14 ngày.", [evidence(document_version_id=None)]),
        ("Chắc chắn đúng.", []),
    ]:
        result = critic_node({"final_answer": answer, "evidence": docs})
        assert result["grounding_status"] == "unverified"
        assert result["grounding_score"] is None
        assert not result["matched_evidence"]
        refusal = abstain_node({"final_answer": answer, **result})
        assert answer not in refusal["final_answer"]


def test_fixed_greeting_is_not_a_grounding_score():
    result = critic_node({"final_answer": "Xin chào!", "evidence": []})
    assert result["grounding_status"] == "not_applicable"
    assert result["grounding_score"] is None


def test_mock_knowledge_is_not_returned_as_a_real_policy():
    async def check():
        context = ToolContext(principal=Principal(user_id="test", role="customer"), idempotency_key="test", thread_id="test", run_id="test")
        try:
            await search_knowledge.func(SearchKnowledgeInput(query="đổi trả"), context)
        except ToolUnavailableError:
            return
        raise AssertionError("Unverified mock policy must not be returned")
    asyncio.run(check())
