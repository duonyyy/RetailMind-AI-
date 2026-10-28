"""Enterprise Context Budget Manager (10/4/3/3 Rule).

Adapted from VinAI Track 3 Day 17 architecture for RetailMind AI.
Prevents context window bloat and optimizes prompt caching stability.
Memory footprint is capped at strictly 20% of the total model context window:
- Short-term (Working turns + summary): 10%
- Long-term (Declarative user facts): 4%
- Episodic (Past trajectories & reflections): 3%
- Semantic (RAG domain knowledge): 3%
Remaining 80% is preserved for system instructions, tool definitions, and LLM output.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple, Optional


def estimate_tokens(text: str) -> int:
    """Fast deterministic token estimator (approx 4 chars per token)."""
    if not text:
        return 0
    return max(1, len(text) // 4)


@dataclass(frozen=True)
class LayerBudget:
    """Fractional allocations for each memory tier."""
    short_term: float = 0.10
    long_term: float = 0.04
    episodic: float = 0.03
    semantic: float = 0.03


class ContextBudgetManager:
    """Enforces strict token quotas across memory tiers."""

    priority = ("short_term", "long_term", "episodic", "semantic")

    def __init__(
        self,
        total_context_tokens: int = 16000,
        budget: Optional[LayerBudget] = None,
    ) -> None:
        self.total_context_tokens = total_context_tokens
        self.budget = budget or LayerBudget()

    def layer_limit(self, layer: str) -> int:
        """Returns the maximum allowed token count for the given memory layer."""
        fraction = getattr(self.budget, layer, 0.05)
        return max(10, int(self.total_context_tokens * fraction))

    def trim(self, text: str, max_tokens: int) -> str:
        """
        Head-preserving trim.
        Salient summary and top-ranked facts reside at the HEAD, so truncate the TAIL.
        """
        if not text:
            return ""
        if estimate_tokens(text) <= max_tokens:
            return text
        max_chars = max_tokens * 4
        return text[:max_chars].rstrip() + "\n[...trimmed by context budget...]"

    def assemble(self, layers: Dict[str, str]) -> Tuple[str, Dict[str, Dict[str, int]]]:
        """
        Assembles retrieved content from active layers within their respective budget limits.
        Returns:
            Tuple of (formatted_xml_string, token_breakdown_telemetry)
        """
        rendered: list[str] = []
        breakdown: Dict[str, Dict[str, int]] = {}

        for layer in self.priority:
            raw = layers.get(layer, "") or ""
            limit = self.layer_limit(layer)
            trimmed = self.trim(raw, limit)

            breakdown[layer] = {
                "limit_tokens": limit,
                "raw_tokens": estimate_tokens(raw),
                "used_tokens": estimate_tokens(trimmed),
            }

            if trimmed.strip():
                tag = layer.upper()
                rendered.append(f"<{tag}>\n{trimmed.strip()}\n</{tag}>")

        return "\n\n".join(rendered), breakdown

