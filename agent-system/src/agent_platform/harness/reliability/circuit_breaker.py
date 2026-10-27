"""3-Phase Circuit Breaker for Resilient Model & API Failure Protection."""

from __future__ import annotations
import time
from enum import StrEnum
from dataclasses import dataclass, field
from typing import List


class CircuitState(StrEnum):
    CLOSED = "closed"          # Healthy, traffic flows normally
    OPEN = "open"              # Broken upstream, fail-fast without calling upstream
    HALF_OPEN = "half_open"    # Probing upstream health with 1 request


@dataclass
class CircuitBreaker:
    name: str
    failure_threshold: int = 3
    reset_timeout_seconds: float = 30.0
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    opened_at: float | None = None
    transition_logs: List[str] = field(default_factory=list)

    def allow_request(self) -> bool:
        current_time = time.monotonic()
        if self.state == CircuitState.CLOSED:
            return True
        if self.state == CircuitState.OPEN:
            if self.opened_at and (current_time - self.opened_at) >= self.reset_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                self.transition_logs.append(f"[{time.time()}] {self.name}: OPEN -> HALF_OPEN")
                return True
            return False
        if self.state == CircuitState.HALF_OPEN:
            return True
        return False

    def record_success(self) -> None:
        self.failure_count = 0
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.CLOSED
            self.transition_logs.append(f"[{time.time()}] {self.name}: HALF_OPEN -> CLOSED")

    def record_failure(self) -> None:
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = time.monotonic()
            self.transition_logs.append(f"[{time.time()}] {self.name}: CLOSED -> OPEN")
