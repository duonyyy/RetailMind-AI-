"""Enterprise 4-Tier Memory Substrate: Working, Declarative, Episodic & Context Budgeting.

Complies with AGENTS.md, Decree 13/2023/ND-CP, and VinAI Track 3 Day 17 architecture:
- Tier 1: Working Short-Term Memory with Compaction & Durable Notes (10% budget)
- Tier 2: Declarative User Facts with Recency Wins Conflict Handling (4% budget)
- Tier 3: Episodic Memory with Ebbinghaus Decay & Reusable Strategies (3% budget)
- Tier 4: Context Budget Manager assembling XML context within 20% model capacity
"""

from __future__ import annotations

import time
import math
from typing import List, Dict, Any, Optional, Tuple

from .contracts import DurableFact, FactValidity, EpisodicTrajectory, ChatMessage
from .short_term import ShortTermMemory
from .context_budget import ContextBudgetManager, LayerBudget
from .router import route_memory_query
from .privacy import MemoryPrivacyGuard

# Backward-compatible alias
FactItem = DurableFact


class EnterpriseMemoryManager:
    """
    Enterprise Multi-Tier Memory Engine.
    Unifies Short-term compaction, Declarative profile facts, Episodic reflections,
    and Dynamic 10/4/3/3 token budgeting.
    """

    def __init__(
        self,
        short_term_capacity: int = 6,
        ebbinghaus_half_life_days: float = 7.0,
        total_context_tokens: int = 16000,
    ) -> None:
        self.short_term_capacity = short_term_capacity
        self.ebbinghaus_half_life_days = ebbinghaus_half_life_days
        self.half_life_seconds = ebbinghaus_half_life_days * 86400.0

        # Subsystems
        self.budget_manager = ContextBudgetManager(total_context_tokens=total_context_tokens)
        self.privacy_guard = MemoryPrivacyGuard()

        # Tier 1: Short-term memory instances per session
        self._short_term_sessions: Dict[str, ShortTermMemory] = {}
        # Legacy dict format for backward compatibility
        self.working_memory: Dict[str, List[Dict[str, str]]] = {}

        # Tier 2: Long-term Declarative Facts per user: user_id -> key -> DurableFact
        self.declarative_facts: Dict[str, Dict[str, DurableFact]] = {}
        # History of superseded facts for provenance
        self._fact_history: Dict[str, List[DurableFact]] = {}

        # Tier 3: Episodic Memory archive
        self.episodic_archive: List[EpisodicTrajectory] = []

    # -------------------------------------------------------------------------
    # TIER 1: WORKING SHORT-TERM MEMORY (COMPACTION & DURABLE NOTES)
    # -------------------------------------------------------------------------
    def _get_or_create_short_term(self, session_id: str) -> ShortTermMemory:
        if session_id not in self._short_term_sessions:
            self._short_term_sessions[session_id] = ShortTermMemory(
                strategy="sliding",
                max_recent_messages=self.short_term_capacity,
            )
        return self._short_term_sessions[session_id]

    def add_working_turn(self, session_id: str, role: str, content: str) -> None:
        """Records a dialogue turn; compacts older turns when token pressure rises."""
        # 1. Update ShortTermMemory with compaction engine
        stm = self._get_or_create_short_term(session_id)
        stm.add(role, content)

        # 2. Maintain legacy dict for backward compatibility
        if session_id not in self.working_memory:
            self.working_memory[session_id] = []
        self.working_memory[session_id].append({"role": role, "content": content})
        if len(self.working_memory[session_id]) > self.short_term_capacity * 2:
            self.working_memory[session_id] = self.working_memory[session_id][-self.short_term_capacity * 2:]

    def get_working_context(self, session_id: str) -> List[Dict[str, str]]:
        """Returns raw message history of current session."""
        return self.working_memory.get(session_id, [])

    def render_short_term(self, session_id: str) -> str:
        """Renders compacted session summary, durable notes, and recent turns."""
        stm = self._get_or_create_short_term(session_id)
        return stm.render()

    # -------------------------------------------------------------------------
    # TIER 2: LONG-TERM DECLARATIVE FACTS (RECENCY WINS & DECREE 13)
    # -------------------------------------------------------------------------
    def set_user_fact(
        self,
        user_id: str,
        key: str,
        value: Any,
        source: str = "",
        confidence: float = 1.0,
    ) -> None:
        """
        Records or updates a user fact adhering to 'Recency Wins'.
        If fact already exists, the old one is superseded and archived for provenance.
        Sanitizes PII and enforces privacy consent.
        """
        if not self.privacy_guard.check_consent(user_id):
            return

        # PII minimization
        clean_value = self.privacy_guard.minimize_pii(str(value)) if isinstance(value, str) else value

        if user_id not in self.declarative_facts:
            self.declarative_facts[user_id] = {}
        if user_id not in self._fact_history:
            self._fact_history[user_id] = []

        now = time.time()
        existing = self.declarative_facts[user_id].get(key)
        if existing and not existing.is_tombstoned:
            # Mark previous as superseded (Recency Wins)
            existing.validity = FactValidity.SUPERSEDED
            existing.superseded_by = f"{key}_{int(now)}"
            self._fact_history[user_id].append(existing)

        new_fact = DurableFact(
            key=key,
            value=clean_value,
            scope="user",
            validity=FactValidity.CURRENT,
            confidence=confidence,
            source=source,
            created_at=existing.created_at if existing else now,
            updated_at=now,
        )
        self.declarative_facts[user_id][key] = new_fact

    def consolidate_facts(self, user_id: str, new_facts: Dict[str, Any], source: str = "") -> None:
        """Bulk updates facts for a customer profile (e.g. from post-chat reflection worker)."""
        for k, v in new_facts.items():
            self.set_user_fact(user_id, k, v, source=source)

    def get_user_facts(self, user_id: str) -> Dict[str, Any]:
        """Returns currently valid, non-tombstoned facts."""
        facts = self.declarative_facts.get(user_id, {})
        return {
            k: v.value
            for k, v in facts.items()
            if not v.is_tombstoned and v.validity == FactValidity.CURRENT
        }

    def render_declarative(self, user_id: str) -> str:
        """Formats active customer facts as a structured list for prompt injection."""
        facts = self.get_user_facts(user_id)
        if not facts:
            return ""
        lines = [f"- {k}: {v}" for k, v in facts.items()]
        return "\n".join(lines)

    def exercise_right_to_be_forgotten(self, user_id: str, key: Optional[str] = None) -> bool:
        """
        Soft-deletes (tombstones) customer facts under Decree 13/2023/ND-CP.
        If key is None, tombstones the customer's entire profile.
        """
        if user_id not in self.declarative_facts:
            return False

        now = time.time()
        if key:
            fact = self.declarative_facts[user_id].get(key)
            if fact:
                fact.is_tombstoned = True
                fact.tombstoned_at = now
                fact.validity = FactValidity.EXPIRED
                return True
            return False
        else:
            for fact in self.declarative_facts[user_id].values():
                fact.is_tombstoned = True
                fact.tombstoned_at = now
                fact.validity = FactValidity.EXPIRED
            return True

    # -------------------------------------------------------------------------
    # TIER 3: EPISODIC MEMORY (TRAJECTORIES, REFLECTIONS & DECAY)
    # -------------------------------------------------------------------------
    def record_episode(self, trajectory: EpisodicTrajectory) -> None:
        """Stores past interaction trajectory and reflection for few-shot guidance."""
        self.episodic_archive.append(trajectory)

    def retrieve_similar_episodes(
        self,
        current_goal: str,
        top_k: int = 2,
        apply_decay: bool = True,
    ) -> List[EpisodicTrajectory]:
        """
        Retrieves top relevant episodes scored by lexical match and Ebbinghaus time retention.
        """
        if not current_goal:
            return []

        goal_words = set(current_goal.lower().split())
        scored: List[tuple[float, EpisodicTrajectory]] = []

        for ep in self.episodic_archive:
            overlap = len(goal_words.intersection(set(ep.goal.lower().split())))
            if overlap == 0:
                continue

            score = float(overlap)
            if apply_decay:
                decay = self.compute_ebbinghaus_retention(
                    initial_strength=ep.importance,
                    elapsed_seconds=max(0.0, time.time() - ep.timestamp),
                )
                score *= decay

            scored.append((score, ep))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [ep for _, ep in scored[:top_k]]

    def render_episodic(self, current_goal: str, top_k: int = 2) -> str:
        """Formats retrieved episodes and reusable strategies for prompt injection."""
        episodes = self.retrieve_similar_episodes(current_goal, top_k=top_k)
        if not episodes:
            return ""
        rendered_blocks: List[str] = []
        for i, ep in enumerate(episodes, 1):
            block = (
                f"[Tình huống #{i}]: {ep.goal}\n"
                f"- Kết quả: {'Thành công' if ep.outcome_success else 'Thất bại'}\n"
                f"- Chiến lược: {ep.reusable_strategy or ep.reflection_critique}"
            )
            rendered_blocks.append(block)
        return "\n\n".join(rendered_blocks)

    def compute_ebbinghaus_retention(self, initial_strength: float, elapsed_seconds: float) -> float:
        """Computes exponential retention: R = S * exp(-ln(2) * t / half_life)."""
        decay_constant = math.log(2) / self.half_life_seconds
        return round(initial_strength * math.exp(-decay_constant * elapsed_seconds), 4)

    # -------------------------------------------------------------------------
    # TIER 4: ASSEMBLED CONTEXT RETRIEVAL (10/4/3/3 BUDGET PIPELINE)
    # -------------------------------------------------------------------------
    def retrieve_merged_context(
        self,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        query: str = "",
        semantic_text: str = "",
        *,
        session_key: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Dict[str, int]]]:
        """
        Unified Enterprise Memory Retrieval:
        1. Routes query to relevant memory layers (cutting latency & DB load).
        2. Retrieves content from active layers.
        3. Assembles into strict 10/4/3/3 XML tags:
           <SHORT_TERM>, <LONG_TERM>, <EPISODIC>, <SEMANTIC>
        """
        effective_session = session_id or session_key or ""
        effective_user = user_id or ""
        active_layers = set(route_memory_query(query))
        layer_payloads: Dict[str, str] = {}

        # 1. Short-term
        if "short_term" in active_layers and effective_session:
            layer_payloads["short_term"] = self.render_short_term(effective_session)

        # 2. Long-term declarative
        if "long_term" in active_layers and effective_user:
            layer_payloads["long_term"] = self.render_declarative(effective_user)

        # 3. Episodic
        if "episodic" in active_layers:
            layer_payloads["episodic"] = self.render_episodic(query, top_k=2)

        # 4. Semantic domain knowledge
        if "semantic" in active_layers and semantic_text:
            layer_payloads["semantic"] = semantic_text

        # Assemble under 10/4/3/3 quota
        return self.budget_manager.assemble(layer_payloads)

    def stats(self) -> Dict[str, Any]:
        """Telemetry diagnostics across all memory tiers."""
        total_facts = sum(len(facts) for facts in self.declarative_facts.values())
        active_facts = sum(
            len([f for f in facts.values() if not f.is_tombstoned and f.validity == FactValidity.CURRENT])
            for facts in self.declarative_facts.values()
        )
        return {
            "active_sessions": len(self._short_term_sessions),
            "total_users_tracked": len(self.declarative_facts),
            "total_facts_stored": total_facts,
            "active_facts": active_facts,
            "episodic_trajectories_stored": len(self.episodic_archive),
        }
