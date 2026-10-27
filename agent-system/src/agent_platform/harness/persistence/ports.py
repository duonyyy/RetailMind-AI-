from typing import Protocol, Optional, Any, Dict, List, runtime_checkable

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
