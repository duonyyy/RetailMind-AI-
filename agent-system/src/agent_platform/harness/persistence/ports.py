import re
from typing import Protocol, Optional, Any, Dict, List, runtime_checkable

from agent_platform.harness.guards.pii import PIIMasker

_DSN_SECRET_REGEX = re.compile(
    r"(?:postgres(?:ql)?|redis|rediss)://[^\s'\"<>]+|"
    r"(?:password|passwd|pwd|secret|token)\s*=\s*[^\s,;'\"]+",
    re.IGNORECASE,
)


class PersistenceError(RuntimeError):
    """Raised when a durable persistence operation fails (fail-closed)."""


def sanitize_persistence_error(exc: BaseException) -> str:
    """Scrub connection strings, credentials, and PII from persistence exceptions."""
    raw = f"{type(exc).__name__}: {exc}"
    scrubbed = _DSN_SECRET_REGEX.sub("[REDACTED_DSN]", raw)
    return PIIMasker.mask_text(scrubbed)


@runtime_checkable
class KVStorePort(Protocol):
    """Abstract port for Key-Value persistence across dev and prod adapters."""

    async def get(self, key: str) -> Optional[Any]:
        ...

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        ...

    async def delete(self, key: str) -> bool:
        ...

    async def list_keys(self, prefix: str = "") -> List[str]:
        ...

@runtime_checkable
class AuditPort(Protocol):
    """Abstract port for durable audit event persistence."""

    async def save_event(self, event_data: Dict[str, Any]) -> None:
        ...

    async def query_events(
        self, thread_id: Optional[str] = None, limit: int = 100
    ) -> List[Dict[str, Any]]:
        ...
