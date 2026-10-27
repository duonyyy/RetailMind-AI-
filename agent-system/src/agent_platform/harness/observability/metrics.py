"""Prometheus metrics collector and exporter format."""

from typing import Dict, Any


class MetricsCollector:
    """Collects and formats telemetry metrics for Prometheus scraping."""

    def __init__(self):
        self._counters: Dict[str, int] = {
            "requests_total": 0,
            "requests_failed": 0,
            "cache_hits_total": 0,
            "circuit_breaker_trips": 0,
            "hitl_escalations_total": 0,
        }

    def increment(self, name: str, count: int = 1):
        if name in self._counters:
            self._counters[name] += count

    def get_prometheus_text(self) -> str:
        lines = []
        for name, value in self._counters.items():
            lines.append(f"# TYPE enterprise_ai_{name} counter")
            lines.append(f"enterprise_ai_{name} {value}")
        return "\n".join(lines) + "\n"
