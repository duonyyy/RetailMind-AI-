"""Working Short-Term Memory with Dynamic Pressure Compaction and Durable Notes.

Adapted from VinAI Track 3 Day 17 (ZepMemory4Agent) for Enterprise RetailMind AI.
Maintains recent turns, extracts critical user constraints, and summarizes old dialogue.
"""

from __future__ import annotations

import re
from typing import Literal, List, Dict
from .contracts import ChatMessage

Strategy = Literal["buffer", "summary", "sliding"]

DURABLE_PATTERNS = (
    "todo",
    "deadline",
    "constraint",
    "decision",
    "must",
    "bat buoc",
    "bắt buộc",
    "khong duoc quen",
    "không được quên",
    "uu tien",
    "ưu tiên",
    "ngan sach",
    "ngân sách",
    "yeu cau",
    "yêu cầu",
    "so thich",
    "sở thích",
    "preference",
    "khong thich",
    "không thích",
)


def estimate_tokens(text: str) -> int:
    """Fast deterministic token estimator (approx 4 chars per token)."""
    if not text:
        return 0
    return max(1, len(text) // 4)


class ShortTermMemory:
    """
    Tier 1: Working Short-term Memory Substrate.
    Features:
    - Auto-compaction upon reaching token or turn threshold.
    - Durable Notes extraction: preserves critical constraints across compactions.
    - Formats output for optimal LLM attention head.
    """

    def __init__(
        self,
        strategy: Strategy = "sliding",
        max_recent_messages: int = 6,
        pressure_tokens: int = 600,
    ) -> None:
        self.strategy = strategy
        self.max_recent_messages = max_recent_messages
        self.pressure_tokens = pressure_tokens
        self.messages: List[ChatMessage] = []
        self.summary: str = ""
        self.durable_notes: List[str] = []
        self.compactions: int = 0

    def add(self, role: str, content: str) -> None:
        """Adds a message turn and triggers compaction if under memory pressure."""
        self.messages.append(ChatMessage(role=role, content=content))
        if self.strategy != "buffer" and self.detect_pressure():
            self.compact()

    def detect_pressure(self) -> bool:
        """Detects whether current dialogue exceeds safe working memory bounds."""
        if len(self.messages) > self.max_recent_messages:
            return True
        return estimate_tokens(self._render_messages(self.messages)) > self.pressure_tokens

    def extract_durable_notes(self, messages: List[ChatMessage]) -> List[str]:
        """Extracts immutable constraints and preferences from turns before they get pruned."""
        notes: List[str] = []
        for msg in messages:
            text = msg.content.strip()
            low = text.casefold()
            # Detect SKU patterns or constraint keywords
            has_sku = bool(re.search(r"\b(LAP|PHU|DT|ORD|TCK)-[A-Z0-9-]{3,}\b", text))
            has_durable = any(p in low for p in DURABLE_PATTERNS)
            if has_durable or has_sku:
                note = f"{msg.role}: {text}"
                if note not in self.durable_notes and note not in notes:
                    notes.append(note)
        return notes

    def _summarize(self, messages: List[ChatMessage]) -> str:
        """Deterministic extractive summarizer preserving decision points without requiring external LLM call."""
        notes = self.extract_durable_notes(messages)
        if notes:
            return " | ".join(notes[-6:])
        snippets = [f"{m.role}: {m.content[:100]}" for m in messages[-4:]]
        return " | ".join(snippets)

    def compact(self) -> None:
        """Coalesces older messages into durable notes and summary block."""
        if len(self.messages) <= 2:
            return

        if self.strategy == "summary":
            old = self.messages[:-2]
            keep = self.messages[-2:]
        else:  # sliding
            keep_n = max(2, self.max_recent_messages // 2)
            old = self.messages[:-keep_n]
            keep = self.messages[-keep_n:]

        if not old:
            return

        # 1. Harvest durable constraints from older turns
        new_notes = self.extract_durable_notes(old)
        for note in new_notes:
            if note not in self.durable_notes:
                self.durable_notes.append(note)

        # 2. Append to summary chain
        old_summary = self._summarize(old)
        if old_summary:
            if self.summary:
                self.summary = f"{self.summary} | {old_summary}"
            else:
                self.summary = old_summary
            # Bound summary length to prevent unbound growth
            self.summary = self.summary[-2000:]

        self.messages = keep
        self.compactions += 1

    def render(self) -> str:
        """Renders assembled XML block ready for prompt injection."""
        if self.strategy == "buffer":
            return self._render_messages(self.messages)

        parts: List[str] = []
        if self.summary:
            parts.append(f"<SESSION_SUMMARY>\n{self.summary}\n</SESSION_SUMMARY>")
        if self.durable_notes:
            parts.append("<DURABLE_NOTES>\n- " + "\n- ".join(self.durable_notes[-8:]) + "\n</DURABLE_NOTES>")
        if self.messages:
            parts.append("<RECENT_TURNS>\n" + self._render_messages(self.messages) + "\n</RECENT_TURNS>")
        return "\n".join(parts)

    @staticmethod
    def _render_messages(messages: List[ChatMessage]) -> str:
        return "\n".join(f"{m.role}: {m.content}" for m in messages)

    def stats(self) -> Dict[str, int]:
        """Telemetry diagnostics on compaction effectiveness."""
        rendered = self.render()
        return {
            "messages_kept": len(self.messages),
            "durable_notes": len(self.durable_notes),
            "compactions": self.compactions,
            "estimated_tokens": estimate_tokens(rendered),
        }

