"""Enterprise 4-Tier Memory Substrate: Working, Declarative, Episodic & Ebbinghaus Decay."""

from __future__ import annotations
import time
import math
from typing import List, Dict, Any
from pydantic import BaseModel, Field


class FactItem(BaseModel):
    key: str
    value: Any
    confidence: float = 1.0
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    is_tombstoned: bool = False  # Soft delete under Decree 13 Right-to-be-forgotten


class EpisodicTrajectory(BaseModel):
    task_id: str
    goal: str
    steps_taken: List[str]
    outcome_success: bool
    reflection_critique: str
    timestamp: float = Field(default_factory=time.time)


class EnterpriseMemoryManager:
    """Manages Working Memory, Long-term Facts, Episodic Reflexions, and Ebbinghaus Decay."""

    def __init__(self, short_term_capacity: int = 5, ebbinghaus_half_life_days: float = 7.0):
        self.short_term_capacity = short_term_capacity
        self.half_life_seconds = ebbinghaus_half_life_days * 86400.0

        # Tier 1: Working Memory per session
        self.working_memory: Dict[str, List[Dict[str, str]]] = {}
        # Tier 2: Long-term Declarative Facts per user
        self.declarative_facts: Dict[str, Dict[str, FactItem]] = {}
        # Tier 3: Episodic Memory archive
        self.episodic_archive: List[EpisodicTrajectory] = []

    # --- TIER 1: WORKING MEMORY ---
    def add_working_turn(self, session_id: str, role: str, content: str) -> None:
        if session_id not in self.working_memory:
            self.working_memory[session_id] = []
        self.working_memory[session_id].append({"role": role, "content": content})
        if len(self.working_memory[session_id]) > self.short_term_capacity * 2:
            self.working_memory[session_id] = self.working_memory[session_id][-self.short_term_capacity * 2:]

    def get_working_context(self, session_id: str) -> List[Dict[str, str]]:
        return self.working_memory.get(session_id, [])

    # --- TIER 2: LONG-TERM DECLARATIVE ---
    def set_user_fact(self, user_id: str, key: str, value: Any) -> None:
        if user_id not in self.declarative_facts:
            self.declarative_facts[user_id] = {}
        self.declarative_facts[user_id][key] = FactItem(key=key, value=value, updated_at=time.time())

    def get_user_facts(self, user_id: str) -> Dict[str, Any]:
        facts = self.declarative_facts.get(user_id, {})
        return {k: v.value for k, v in facts.items() if not v.is_tombstoned}

    def exercise_right_to_be_forgotten(self, user_id: str, key: str) -> bool:
        """Tombstones user fact in compliance with Decree 13 Right-to-be-Forgotten."""
        if user_id in self.declarative_facts and key in self.declarative_facts[user_id]:
            self.declarative_facts[user_id][key].is_tombstoned = True
            return True
        return False

    # --- TIER 3: EPISODIC MEMORY ---
    def record_episode(self, trajectory: EpisodicTrajectory) -> None:
        self.episodic_archive.append(trajectory)

    def retrieve_similar_episodes(self, current_goal: str, top_k: int = 2) -> List[EpisodicTrajectory]:
        goal_words = set(current_goal.lower().split())
        scored = []
        for ep in self.episodic_archive:
            score = len(goal_words.intersection(set(ep.goal.lower().split())))
            scored.append((score, ep))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [ep for _, ep in scored[:top_k]]

    # --- TIER 4: EBBINGHAUS FORGETTING CURVE ---
    def compute_ebbinghaus_retention(self, initial_strength: float, elapsed_seconds: float) -> float:
        decay_constant = math.log(2) / self.half_life_seconds
        return round(initial_strength * math.exp(-decay_constant * elapsed_seconds), 4)
