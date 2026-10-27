"""5-Tier Fallback Ladder for Graceful Degradation & Zero-500 Resilience.

Complies with Section 6.3 & Checklist Item 14 of Enterprise Agentic AI Architecture:
Guarantees the system never returns an unhandled HTTP 500 when upstream LLMs fail.

Ladder Hierarchy:
  Tier 1: Primary Model Call (vLLM / Target LLM)
  Tier 2: Semantic Vector Cache (< 5ms, 0 Token Cost)
  Tier 3: Compact / Quantized Local Fallback Model
  Tier 4: Extractive Heuristic Synthesizer (Direct Evidence Extraction)
  Tier 5: Safe Graceful Degradation Notice (Safe User Advisory)
"""

from __future__ import annotations

import time
import logging
from enum import StrEnum
from dataclasses import dataclass, field
from typing import Callable, Any, List, Dict, Optional

logger = logging.getLogger("retailmind.reliability.fallback_ladder")


class FallbackTier(StrEnum):
    TIER_1_PRIMARY = "tier_1_primary_model"
    TIER_2_CACHE = "tier_2_semantic_cache"
    TIER_3_LOCAL_MODEL = "tier_3_local_fallback_model"
    TIER_4_EXTRACTIVE = "tier_4_extractive_heuristic"
    TIER_5_DEGRADATION = "tier_5_graceful_degradation"


@dataclass
class FallbackResult:
    """Standardized output of the Fallback Ladder execution."""
    tier_used: FallbackTier
    content: str
    is_fallback: bool
    latency_ms: float
    error_detail: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class FallbackLadder:
    """Orchestrates 5 tiers of resilience preventing silent crashes or HTTP 500 errors."""

    DEFAULT_DEGRADATION_NOTICE = (
        "Hệ thống đang bảo trì dịch vụ phân tích chuyên sâu. "
        "Yêu cầu của bạn đã được ghi nhận vào sổ cái kiểm toán để xử lý ưu tiên. "
        "Vui lòng tham khảo tài liệu nội bộ hoặc liên hệ quản trị viên."
    )

    def __init__(self, degradation_notice: str = DEFAULT_DEGRADATION_NOTICE):
        self.degradation_notice = degradation_notice

    def execute(
        self,
        query: str,
        primary_fn: Callable[[], str],
        contexts: Optional[List[Dict[str, Any]]] = None,
        cache_fn: Optional[Callable[[str], Optional[str]]] = None,
        local_model_fn: Optional[Callable[[str, List[Dict[str, Any]]], str]] = None,
    ) -> FallbackResult:
        """Execute request cascading down the 5-tier ladder upon failure."""
        start_time = time.monotonic()
        ladder_errors: List[str] = []

        # Tier 1: Primary Model Call
        try:
            result = primary_fn()
            if result and result.strip():
                duration = (time.monotonic() - start_time) * 1000
                return FallbackResult(
                    tier_used=FallbackTier.TIER_1_PRIMARY,
                    content=result,
                    is_fallback=False,
                    latency_ms=round(duration, 2),
                    metadata={"step": "primary_success"}
                )
        except Exception as e:
            msg = f"Tier 1 (Primary Model) failed: {e}"
            logger.warning(msg)
            ladder_errors.append(msg)

        # Tier 2: Semantic / Exact Cache Lookup
        if cache_fn:
            try:
                cached = cache_fn(query)
                if cached and cached.strip():
                    duration = (time.monotonic() - start_time) * 1000
                    return FallbackResult(
                        tier_used=FallbackTier.TIER_2_CACHE,
                        content=cached,
                        is_fallback=True,
                        latency_ms=round(duration, 2),
                        metadata={"source": "cache", "token_cost": 0.0}
                    )
            except Exception as e:
                msg = f"Tier 2 (Cache) lookup failed: {e}"
                logger.warning(msg)
                ladder_errors.append(msg)

        # Tier 3: Compact / Local Fallback Model
        if local_model_fn:
            try:
                local_res = local_model_fn(query, contexts or [])
                if local_res and local_res.strip():
                    duration = (time.monotonic() - start_time) * 1000
                    return FallbackResult(
                        tier_used=FallbackTier.TIER_3_LOCAL_MODEL,
                        content=local_res,
                        is_fallback=True,
                        latency_ms=round(duration, 2),
                        metadata={"source": "local_fallback_model"}
                    )
            except Exception as e:
                msg = f"Tier 3 (Local Model) failed: {e}"
                logger.warning(msg)
                ladder_errors.append(msg)

        # Tier 4: Extractive Heuristic Synthesizer (from retrieved chunks)
        if contexts:
            try:
                extracted = self._synthesize_extractive(query, contexts)
                if extracted and extracted.strip():
                    duration = (time.monotonic() - start_time) * 1000
                    return FallbackResult(
                        tier_used=FallbackTier.TIER_4_EXTRACTIVE,
                        content=extracted,
                        is_fallback=True,
                        latency_ms=round(duration, 2),
                        metadata={"source": "extractive_heuristic", "chunks_used": len(contexts)}
                    )
            except Exception as e:
                msg = f"Tier 4 (Extractive Heuristic) failed: {e}"
                logger.warning(msg)
                ladder_errors.append(msg)

        # Tier 5: Safe Graceful Degradation Notice (Guaranteed Non-Crashing)
        duration = (time.monotonic() - start_time) * 1000
        return FallbackResult(
            tier_used=FallbackTier.TIER_5_DEGRADATION,
            content=self.degradation_notice,
            is_fallback=True,
            latency_ms=round(duration, 2),
            error_detail="; ".join(ladder_errors),
            metadata={"status": "degraded_service", "errors": ladder_errors}
        )

    @staticmethod
    def _synthesize_extractive(query: str, contexts: List[Dict[str, Any]]) -> str:
        """Deterministically extract high-value statutes/snippets without calling an LLM."""
        if not contexts:
            return ""

        top_chunk = contexts[0]
        title = top_chunk.get("title", "Tài liệu quy định")
        statute = top_chunk.get("statute", "Quy chế")
        snippet = top_chunk.get("snippet", top_chunk.get("content", top_chunk.get("clean_text", ""))).strip()

        return (
            f"[Tổng hợp trích xuất dự phòng]: Căn cứ theo {title} ({statute}): "
            f"\"{snippet}\". (Dữ liệu được trích xuất trực tiếp từ hồ sơ gốc do dịch vụ suy luận đang bảo trì)."
        )
