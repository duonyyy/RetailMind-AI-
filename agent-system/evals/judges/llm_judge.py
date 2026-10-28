from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from agent_platform.llm.base import LLMPort
from agent_platform.harness.guards.pii import PIIMasker

class JudgeResult(BaseModel):
    groundedness_score: float = Field(ge=0.0, le=1.0)
    reasoning: str

class TrueLLMJudge:
    """
    Lane 2: True LLM-as-a-Judge evaluating factual consistency.
    Fixes A13: Discards static keyword simulation; evaluates semantic faithfulness.
    """

    RUBRIC = """
    Evaluate factual groundedness on a continuous scale [0.0, 1.0]:
    - 1.0: All facts and numbers are explicitly verified by the provided evidence.
    - 0.5: Response is plausibly correct but includes minor ungrounded extrapolation.
    - 0.0: Response directly contradicts evidence or fabricates terms.
    """

    def __init__(self, judge_llm: LLMPort) -> None:
        self.llm = judge_llm

    async def evaluate(self, query: str, final_answer: str, evidence_snippets: list[str]) -> JudgeResult:
        safe_query = PIIMasker.mask(query, fail_closed=True)
        safe_answer = PIIMasker.mask(final_answer, fail_closed=True)
        safe_snippets = [PIIMasker.mask(s, fail_closed=True) for s in evidence_snippets]
        evidence_text = "\n---\n".join(safe_snippets) if safe_snippets else "[No evidence provided]"
        prompt = f"""
        User Query: {safe_query}
        Agent Answer: {safe_answer}
        Evidence Context:
        {evidence_text}

        Rubric:
        {self.RUBRIC}

        Provide your assessment as:
        SCORE: <float between 0.0 and 1.0>
        REASON: <concise explanation>
        """

        resp = await self.llm.complete([{"role": "user", "content": prompt}], temperature=0.0)
        content = resp.content or ""

        # Parse score
        score = 0.5
        reason = content
        for line in content.split("\n"):
            if line.upper().startswith("SCORE:"):
                try:
                    score = float(line.split(":", 1)[1].strip())
                except Exception:
                    score = 0.5
            elif line.upper().startswith("REASON:"):
                reason = line.split(":", 1)[1].strip()

        return JudgeResult(groundedness_score=max(0.0, min(1.0, score)), reasoning=reason)
