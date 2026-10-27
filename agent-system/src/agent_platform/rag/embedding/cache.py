"""Semantic Vector Cache with TTL Eviction, Threshold Guard, and Tenant Isolation.

Prevents three critical production pitfalls:
1. False Hits: Enforces cosine similarity >= configured threshold (default 0.90).
2. Stale Hits: Automatic eviction based on TTL (ttl_seconds, default 3600s).
3. Cross-Tenant Leaks: Strict isolation by tenant_id / session_id.
"""

from __future__ import annotations

import math
import time
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional


def compute_cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Compute cosine similarity between two vectors safely.
    
    Guarantees no ZeroDivisionError when vectors are zero or empty,
    and clamps the resulting value to [-1.0, 1.0].
    """
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0

    dot = 0.0
    norm1_sq = 0.0
    norm2_sq = 0.0

    for a, b in zip(v1, v2):
        dot += a * b
        norm1_sq += a * a
        norm2_sq += b * b

    if norm1_sq <= 0.0 or norm2_sq <= 0.0:
        return 0.0

    denom = math.sqrt(norm1_sq) * math.sqrt(norm2_sq)
    if denom <= 0.0:
        return 0.0

    similarity = dot / denom
    # Clamp to prevent float precision drift beyond [-1.0, 1.0]
    return max(-1.0, min(1.0, similarity))


@dataclass
class SemanticCacheEntry:
    """Represents an individual entry in the semantic vector cache."""
    query_vector: List[float]
    answer: str
    tenant_id: str
    created_at: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class SemanticVectorCache:
    """In-memory semantic vector cache with tenant isolation, TTL eviction, and telemetry."""

    def __init__(
        self,
        threshold: float = 0.90,
        ttl_seconds: int = 3600,
        max_entries: int = 5000,
    ):
        self.threshold = threshold
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self.entries: List[SemanticCacheEntry] = []
        self._hits: int = 0
        self._misses: int = 0
        self._stale_evictions: int = 0

    def __len__(self) -> int:
        return len(self.entries)

    def evict_stale(self, now: Optional[float] = None) -> int:
        """Evict all entries that have expired beyond ttl_seconds.
        
        Returns the number of evicted items.
        """
        current_time = now if now is not None else time.time()
        active: List[SemanticCacheEntry] = []
        evicted = 0

        for entry in self.entries:
            if (current_time - entry.created_at) <= self.ttl_seconds:
                active.append(entry)
            else:
                evicted += 1

        self.entries = active
        self._stale_evictions += evicted
        return evicted

    def get(
        self,
        query_vector: List[float],
        tenant_id: str = "default",
        now: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """Retrieve a cached answer if a semantically equivalent query exists for the tenant.
        
        Args:
            query_vector: Embedding vector of the search query.
            tenant_id: Tenant or session ID for isolation.
            now: Optional current timestamp (useful for deterministic unit testing).
            
        Returns:
            Dictionary with answer, similarity score, metadata, or None if cache miss.
        """
        current_time = now if now is not None else time.time()
        # Purge stale entries first to eliminate Stale Hits
        self.evict_stale(now=current_time)

        # Filter strictly by tenant_id to prevent Cross-Tenant Leak
        tenant_candidates = [e for e in self.entries if e.tenant_id == tenant_id]
        if not tenant_candidates:
            self._misses += 1
            return None

        best_score = -1.0
        best_entry: Optional[SemanticCacheEntry] = None

        for entry in tenant_candidates:
            sim = compute_cosine_similarity(query_vector, entry.query_vector)
            if sim > best_score:
                best_score = sim
                best_entry = entry

        # Threshold Guard: Cosine similarity must be >= threshold to eliminate False Hits
        if best_entry is not None and best_score >= self.threshold:
            self._hits += 1
            return {
                "answer": best_entry.answer,
                "score": round(best_score, 4),
                "similarity": best_score,
                "tenant_id": best_entry.tenant_id,
                "metadata": dict(best_entry.metadata),
                "created_at": best_entry.created_at,
            }

        self._misses += 1
        return None

    def set(
        self,
        query_vector: List[float],
        answer: str,
        tenant_id: str = "default",
        metadata: Optional[Dict[str, Any]] = None,
        now: Optional[float] = None,
    ) -> None:
        """Store an answer and its query vector into the semantic cache."""
        current_time = now if now is not None else time.time()
        self.evict_stale(now=current_time)

        # Enforce max entries capacity (evict oldest)
        if len(self.entries) >= self.max_entries:
            self.entries.pop(0)

        entry = SemanticCacheEntry(
            query_vector=list(query_vector),
            answer=answer,
            tenant_id=tenant_id,
            created_at=current_time,
            metadata=dict(metadata) if metadata else {},
        )
        self.entries.append(entry)

    def get_stats(self) -> Dict[str, Any]:
        """Return cache performance telemetry."""
        total = self._hits + self._misses
        hit_rate = round(self._hits / total, 4) if total > 0 else 0.0
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": hit_rate,
            "stale_evictions": self._stale_evictions,
            "size": len(self.entries),
            "threshold": self.threshold,
            "ttl_seconds": self.ttl_seconds,
        }

    def clear(self) -> None:
        """Reset the cache store and all telemetry counters."""
        self.entries.clear()
        self._hits = 0
        self._misses = 0
        self._stale_evictions = 0
