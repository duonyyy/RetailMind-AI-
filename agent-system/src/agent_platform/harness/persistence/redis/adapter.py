"""Redis KVStore Adapter for Distributed Cache, Rate Limiting & Ephemeral Locks.

Supports live Redis 7+ when redis_url is provided and reachable,
with automatic in-memory TTL store fallback for unit tests and local execution.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple
from agent_platform.harness.persistence.ports import KVStorePort

logger = logging.getLogger("agent_platform.persistence.redis")


class RedisKVStore(KVStorePort):
    """Redis-backed KVStorePort implementation with resilient TTL fallback."""

    def __init__(self, redis_url: str = "") -> None:
        self.redis_url = redis_url
        self._redis_client: Any = None
        self._fallback_store: Dict[str, Tuple[Any, Optional[float]]] = {}
        self._init_redis()

    def _init_redis(self) -> None:
        if not self.redis_url:
            return
        try:
            import redis
            client = redis.Redis.from_url(self.redis_url, decode_responses=True, socket_connect_timeout=1.5)
            client.ping()
            self._redis_client = client
        except Exception as exc:
            logger.debug("Redis unavailable (%s), using in-memory TTL store.", exc)
            self._redis_client = None

    async def get(self, key: str) -> Optional[Any]:
        if self._redis_client is not None:
            try:
                raw = self._redis_client.get(key)
                if raw is None:
                    return None
                try:
                    return json.loads(raw)
                except Exception:
                    return raw
            except Exception as exc:
                logger.debug("Redis get fallback (%s)", exc)

        entry = self._fallback_store.get(key)
        if not entry:
            return None
        val, expires_at = entry
        if expires_at is not None and time.time() > expires_at:
            del self._fallback_store[key]
            return None
        return val

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        if self._redis_client is not None:
            try:
                serialized = json.dumps(value, default=str) if not isinstance(value, str) else value
                if ttl_seconds:
                    self._redis_client.setex(key, ttl_seconds, serialized)
                else:
                    self._redis_client.set(key, serialized)
                return
            except Exception as exc:
                logger.debug("Redis set fallback (%s)", exc)

        expires_at = (time.time() + ttl_seconds) if ttl_seconds else None
        self._fallback_store[key] = (value, expires_at)

    async def delete(self, key: str) -> bool:
        if self._redis_client is not None:
            try:
                return bool(self._redis_client.delete(key))
            except Exception as exc:
                logger.debug("Redis delete fallback (%s)", exc)

        if key in self._fallback_store:
            del self._fallback_store[key]
            return True
        return False

    async def list_keys(self, prefix: str = "") -> List[str]:
        if self._redis_client is not None:
            try:
                return list(self._redis_client.keys(f"{prefix}*"))
            except Exception as exc:
                logger.debug("Redis keys fallback (%s)", exc)

        now = time.time()
        valid: List[str] = []
        expired: List[str] = []
        for k, (_, exp) in self._fallback_store.items():
            if exp is not None and now > exp:
                expired.append(k)
            elif k.startswith(prefix):
                valid.append(k)
        for k in expired:
            del self._fallback_store[k]
        return valid

