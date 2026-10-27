"""Context Budget Sentinel: Token Budget Enforcement, 20% Tool Reserve & 40/20/20/20 Golden Ratio.

Complies with Section 3 & Checklist Item 10 of Enterprise Agentic AI Architecture:
Allocates the context window strictly according to the Golden Ratio:
  - 40%: Retrieved Evidence / RAG Chunks
  - 20%: System Prompt & Persona Directives
  - 20%: Short-Term Memory / Recent Chat History
  - 20%: Output Completion Headroom & Thought Scratchpad
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any, Optional


@dataclass
class GoldenRatioAllocation:
    """Explicit token budget quotas per the 40/20/20/20 architectural guideline."""
    evidence_budget: int       # 40%
    system_budget: int         # 20%
    stm_budget: int            # 20%
    headroom_budget: int       # 20%
    total_budget: int

    def to_dict(self) -> Dict[str, int]:
        return {
            "evidence_budget_40pct": self.evidence_budget,
            "system_budget_20pct": self.system_budget,
            "stm_budget_20pct": self.stm_budget,
            "headroom_budget_20pct": self.headroom_budget,
            "total_budget": self.total_budget
        }


class ContextBudgetSentinel:
    """Manages token budget, enforces ceilings, and applies the 40/20/20/20 Golden Ratio."""

    def __init__(self, max_context_tokens: int = 4096, tool_reserve_ratio: float = 0.20):
        self.max_context_tokens = max_context_tokens
        self.tool_reserve_ratio = tool_reserve_ratio
        self.tool_reserve_tokens = int(max_context_tokens * tool_reserve_ratio)
        self.usable_input_tokens = max_context_tokens - self.tool_reserve_tokens

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Heuristic token estimator: 1 token ~ 4 bytes UTF-8."""
        if not text:
            return 0
        return max(1, len(text.encode('utf-8')) // 4)

    def is_within_usable_budget(self, current_tokens: int) -> bool:
        return current_tokens <= self.usable_input_tokens

    def compute_golden_ratio_budget(self, total_tokens: Optional[int] = None) -> GoldenRatioAllocation:
        """Compute exact token quotas for the 40/20/20/20 allocation."""
        total = total_tokens or self.max_context_tokens
        evidence = int(total * 0.40)
        system = int(total * 0.20)
        stm = int(total * 0.20)
        headroom = total - (evidence + system + stm)

        return GoldenRatioAllocation(
            evidence_budget=evidence,
            system_budget=system,
            stm_budget=stm,
            headroom_budget=headroom,
            total_budget=total
        )

    def fit_context_golden_ratio(
        self,
        system_prompt: str,
        chat_history: List[Dict[str, str]],
        retrieved_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Fit context elements into respective 40/20/20/20 slices without Lost-in-the-Middle."""
        quotas = self.compute_golden_ratio_budget()

        # 1. System Prompt (Budget: 20%)
        sys_tokens = self.estimate_tokens(system_prompt)
        sys_overflow = sys_tokens > quotas.system_budget

        # 2. Short-Term Memory (Budget: 20% - take latest messages that fit)
        fitted_history: List[Dict[str, str]] = []
        stm_accum = 0
        for msg in reversed(chat_history):
            content = msg.get("content", "")
            tokens = self.estimate_tokens(content)
            if stm_accum + tokens <= quotas.stm_budget:
                fitted_history.insert(0, msg)
                stm_accum += tokens
            else:
                break

        # 3. Retrieved Evidence (Budget: 40% - take highest ranked chunks)
        fitted_chunks: List[Dict[str, Any]] = []
        evidence_accum = 0
        for chunk in retrieved_chunks:
            content = chunk.get("snippet", chunk.get("content", chunk.get("clean_text", "")))
            tokens = self.estimate_tokens(content)
            if evidence_accum + tokens <= quotas.evidence_budget:
                fitted_chunks.append(chunk)
                evidence_accum += tokens
            else:
                break

        total_consumed = sys_tokens + stm_accum + evidence_accum

        return {
            "quotas": quotas.to_dict(),
            "fitted_system_prompt": system_prompt,
            "fitted_history": fitted_history,
            "fitted_chunks": fitted_chunks,
            "system_tokens": sys_tokens,
            "stm_tokens": stm_accum,
            "evidence_tokens": evidence_accum,
            "total_input_tokens": total_consumed,
            "headroom_tokens_available": quotas.total_budget - total_consumed,
            "is_within_ratios": not sys_overflow and total_consumed <= (quotas.total_budget - quotas.headroom_budget)
        }

    def prune_retrieved_contexts(
        self,
        chunks: List[Dict[str, Any]],
        system_prompt_tokens: int = 200,
        query_tokens: int = 50
    ) -> List[Dict[str, Any]]:
        """Prune low-ranked chunks if total tokens exceed usable input budget."""
        allocated = system_prompt_tokens + query_tokens
        budget_for_chunks = self.usable_input_tokens - allocated

        pruned = []
        accumulated = 0
        for chunk in chunks:
            content = chunk.get("snippet", "") or chunk.get("content", "")
            tokens = self.estimate_tokens(content)
            if accumulated + tokens <= budget_for_chunks:
                pruned.append(chunk)
                accumulated += tokens
            else:
                break
        return pruned

    def evaluate_budget(self, total_tokens_used: int) -> Dict[str, Any]:
        """Evaluate token budget and signal force_finalize if quota threshold reached."""
        is_in_reserve = total_tokens_used >= self.usable_input_tokens
        is_exhausted = total_tokens_used >= self.max_context_tokens

        return {
            "tokens_consumed": total_tokens_used,
            "max_tokens": self.max_context_tokens,
            "usable_tokens": self.usable_input_tokens,
            "is_in_reserve": is_in_reserve,
            "force_finalize": is_in_reserve or is_exhausted,
            "message": (
                "CẢNH BÁO: Đã chạm ngưỡng dự trữ ngân sách token! Buộc đóng vòng lặp và xuất bản kết quả."
                if is_in_reserve else "Ngân sách token an toàn."
            )
        }
