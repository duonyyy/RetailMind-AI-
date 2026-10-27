from typing import Any, Optional, Dict, List
import time
from agent_platform.harness.persistence.ports import KVStorePort

class MemoryKVStore(KVStorePort):
    """In-memory KVStore adapter with TTL expiration."""

    def __init__(self) -> None:
        self._data: Dict[str, Any] = {}
        self._ttls: Dict[str, float] = {}

    def _is_expired(self, key: str) -> bool:
        if key in self._ttls and time.time() > self._ttls[key]:
            del self._data[key]
            del self._ttls[key]
            return True
        return False

    async def get(self, key: str) -> Optional[Any]:
        if self._is_expired(key):
            return None
        return self._data.get(key)

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        self._data[key] = value
        if ttl_seconds:
            self._ttls[key] = time.time() + ttl_seconds
        elif key in self._ttls:
            del self._ttls[key]

    async def delete(self, key: str) -> bool:
        existed = key in self._data
        self._data.pop(key, None)
        self._ttls.pop(key, None)
        return existed

    async def list_keys(self, prefix: str = "") -> List[str]:
        # Clean expired
        for k in list(self._data.keys()):
            self._is_expired(k)
        return [k for k in self._data.keys() if k.startswith(prefix)]
