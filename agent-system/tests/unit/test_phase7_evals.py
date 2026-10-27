import asyncio
import pytest
from evals.checks import DeterministicEvalChecks
from evals.judges.llm_judge import TrueLLMJudge
from agent_platform.llm.providers.scripted import ScriptedLLM

def test_deterministic_eval_checks():
    # Tools check
    assert DeterministicEvalChecks.check_tools(["search_knowledge", "request_refund"], ["search_knowledge"]) is True
    assert DeterministicEvalChecks.check_tools(["search_knowledge"], ["request_refund"]) is False

    # Arguments check
    actual_calls = [{"name": "request_refund", "arguments": {"order_id": "ORD-123", "amount": "100"}}]
    assert DeterministicEvalChecks.check_arguments(actual_calls, {"order_id": "ORD-123"}) is True
    assert DeterministicEvalChecks.check_arguments(actual_calls, {"order_id": "ORD-999"}) is False

    # Refusal & Approval checks
    assert DeterministicEvalChecks.check_refusal("abstained", must_refuse=True) is True
    assert DeterministicEvalChecks.check_refusal("done", must_refuse=True) is False
    assert DeterministicEvalChecks.check_approval("awaiting_approval", must_require_approval=True) is True
    assert DeterministicEvalChecks.check_approval("done", must_require_approval=True) is False

def test_true_llm_judge_evaluation():
    async def _run():
        llm = ScriptedLLM()
        llm.queue_answer("SCORE: 0.95\nREASON: All claims are explicitly grounded in the source snippets.")
        judge = TrueLLMJudge(llm)

        res = await judge.evaluate(
            query="Thời gian đổi trả?",
            final_answer="Khách hàng được đổi trả trong 14 ngày.",
            evidence_snippets=["Chính sách: Khách hàng đổi trả trong 14 ngày."],
        )
        assert res.groundedness_score == 0.95
        assert "explicitly grounded" in res.reasoning

    asyncio.run(_run())
