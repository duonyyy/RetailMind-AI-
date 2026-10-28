"""Data contracts for Enterprise Memory System: Facts, Episodes, and Budgets.

Complies with AGENTS.md, Decree 13/2023/ND-CP, and VinAI Track 3 Day 17 architecture.
"""

from __future__ import annotations

import time
import math
from enum import StrEnum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class FactValidity(StrEnum):
    """Lifecycle validity of declarative facts complying with 'Recency Wins'."""
    CURRENT = "current"
    SUPERSEDED = "superseded"
    EXPIRED = "expired"


class DurableFact(BaseModel):
    """
    Enterprise Declarative Memory Record.
    Adheres to MEMORY_SCHEMA contract with Recency Wins and Decree 13 Right-to-be-forgotten.
    """
    key: str
    value: Any
    scope: str = "user"  # "user", "tenant", "global"
    validity: FactValidity = FactValidity.CURRENT
    confidence: float = 1.0
    source: str = ""  # Originating thread_id or interaction
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    is_tombstoned: bool = False  # Decree 13 Right-to-be-Forgotten soft-delete
    tombstoned_at: Optional[float] = None
    superseded_by: Optional[str] = None  # Key/ID of superseding fact for provenance trace


# Backward-compatible alias
FactItem = DurableFact


class EpisodicTrajectory(BaseModel):
    """
    Episodic Memory Record capturing past execution trajectories, reflections, and reusable strategies.
    Supports Ebbinghaus retention decay and LRU eviction.
    """
    task_id: str
    goal: str
    steps_taken: List[str] = Field(default_factory=list)
    outcome_success: bool = True
    reflection_critique: str = ""
    reusable_strategy: str = ""
    importance: float = 1.0  # Initial importance [0.0 - 1.0]
    timestamp: float = Field(default_factory=time.time)
    last_accessed: float = Field(default_factory=time.time)

    def decayed_importance(self, half_life_days: float = 14.0) -> float:
        """Computes time-decayed importance score using Ebbinghaus exponential curve."""
        elapsed_days = (time.time() - self.timestamp) / 86400.0
        if elapsed_days <= 0:
            return round(self.importance, 4)
        decay = math.exp(-math.log(2) * elapsed_days / max(0.1, half_life_days))
        return round(self.importance * decay, 4)


class ChatMessage(BaseModel):
    """A single turn in working short-term memory."""
    role: str
    content: str
    timestamp: float = Field(default_factory=time.time)
