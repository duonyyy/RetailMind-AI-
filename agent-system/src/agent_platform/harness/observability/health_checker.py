"""3-State Platform Health Protocol (READY, DEGRADED, NOT_READY) for Enterprise Gateways.

Complies with Section 14.3 of Enterprise Data Infra & LLMOps Architecture (Day 28 Capstone):
- Standardizes health telemetry for Kubernetes / Envoy Load Balancers:
    - READY (HTTP 200): All primary subsystems (vLLM inference, DuckDB Lakehouse, Cache) operating normally.
    - DEGRADED (HTTP 200): Secondary degradation (e.g., Circuit Breaker OPEN, Cache offline). System serves
      traffic via the 5-Tier Fallback Ladder. ALB MUST NOT drop traffic.
    - NOT_READY (HTTP 503): Critical failure (database corrupted, catastrophic unrecoverable state). Traffic
      must be dropped and failed over.
"""

from __future__ import annotations

import time
from enum import StrEnum
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable, Tuple

from agent_platform.harness.reliability.circuit_breaker import CircuitBreaker, CircuitState


class PlatformHealthState(StrEnum):
    READY = "ready"
    DEGRADED = "degraded"
    NOT_READY = "not_ready"


@dataclass
class SubsystemReport:
    name: str
    is_healthy: bool
    is_critical: bool = True
    latency_ms: float = 0.0
    message: str = "OK"


class PlatformHealthChecker:
    """Comprehensive readiness evaluator checking primary and secondary infrastructure health."""

    def __init__(self, service_name: str = "retailmind-agentic-platform"):
        self.service_name = service_name
        self._probes: Dict[str, Tuple[Callable[[], Tuple[bool, str]], bool]] = {}
        self._init_default_probes()

    def _init_default_probes(self) -> None:
        """Register default in-process probes."""
        # Probe 1: Basic In-Process Memory & Event Loop (Critical)
        self.register_probe("memory_substrate", lambda: (True, "In-process memory substrate responsive"), is_critical=True)

    def register_probe(
        self,
        name: str,
        probe_fn: Callable[[], Tuple[bool, str]],
        is_critical: bool = True
    ) -> None:
        """Register a subsystem health check probe."""
        self._probes[name] = (probe_fn, is_critical)

    def evaluate_health(
        self,
        circuit_breaker: Optional[CircuitBreaker] = None,
        is_db_connected: bool = True,
        is_cache_online: bool = True
    ) -> Dict[str, Any]:
        """Perform comprehensive readiness check and return 3-state evaluation."""
        subsystems: Dict[str, Any] = {}
        degradation_reasons: List[str] = []
        has_critical_failure = False

        # 1. Evaluate registered probes
        for name, (probe_fn, is_critical) in self._probes.items():
            start = time.perf_counter()
            try:
                ok, msg = probe_fn()
            except Exception as e:
                ok, msg = False, str(e)
            duration = (time.perf_counter() - start) * 1000

            subsystems[name] = {
                "status": "PASS" if ok else "FAIL",
                "is_critical": is_critical,
                "latency_ms": round(duration, 3),
                "message": msg
            }
            if not ok:
                if is_critical:
                    has_critical_failure = True
                    degradation_reasons.append(f"Critical subsystem '{name}' failed: {msg}")
                else:
                    degradation_reasons.append(f"Non-critical subsystem '{name}' degraded: {msg}")

        # 2. Check Database connection
        if not is_db_connected:
            has_critical_failure = True
            subsystems["lakehouse_db"] = {"status": "FAIL", "is_critical": True, "message": "Lakehouse disconnected"}
            degradation_reasons.append("Lakehouse database connection lost.")
        else:
            subsystems["lakehouse_db"] = {"status": "PASS", "is_critical": True, "message": "Lakehouse DuckDB connected"}

        # 3. Check Circuit Breaker
        circuit_state_str = "CLOSED"
        if circuit_breaker:
            circuit_state_str = circuit_breaker.state.value.upper()
            if circuit_breaker.state == CircuitState.OPEN:
                degradation_reasons.append(f"Circuit Breaker '{circuit_breaker.name}' is OPEN. Operating on Fallback Ladder.")
            elif circuit_breaker.state == CircuitState.HALF_OPEN:
                degradation_reasons.append(f"Circuit Breaker '{circuit_breaker.name}' is HALF_OPEN. Probing recovery.")
            subsystems["circuit_breaker"] = {
                "name": circuit_breaker.name,
                "state": circuit_state_str,
                "status": "PASS" if circuit_breaker.state == CircuitState.CLOSED else "DEGRADED"
            }

        # 4. Check Cache
        if not is_cache_online:
            degradation_reasons.append("Semantic Cache offline (fallback to direct serving).")
            subsystems["cache"] = {"status": "DEGRADED", "is_critical": False, "message": "Cache offline"}
        else:
            subsystems["cache"] = {"status": "PASS", "is_critical": False, "message": "Cache active"}

        # Determine Final 3-State Health
        if has_critical_failure:
            overall_state = PlatformHealthState.NOT_READY
            http_code = 503
        elif degradation_reasons:
            overall_state = PlatformHealthState.DEGRADED
            http_code = 200
        else:
            overall_state = PlatformHealthState.READY
            http_code = 200

        return {
            "service": self.service_name,
            "status": overall_state.value,
            "http_status_code": http_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "circuit_state": circuit_state_str,
            "subsystems": subsystems,
            "degradation_reasons": degradation_reasons,
            "can_serve_traffic": overall_state != PlatformHealthState.NOT_READY
        }
