import hashlib
import json
from typing import Dict, Any, Optional

class IdempotencyManager:
    """
    Manages idempotent tool execution results to prevent duplicate side effects.
    Fixes A11: Key calculation is based on sha256(thread_id + tool_call_id), NOT hash(args).
    """

    def __init__(self) -> None:
        self._store: Dict[str, Any] = {}

    @staticmethod
    def generate_key(thread_id: str, tool_call_id: str) -> str:
        """Computes a cryptographically sound idempotency key."""
        raw = f"{thread_id}:{tool_call_id}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def has(self, key: str) -> bool:
        """Checks if result already exists."""
        return key in self._store

    def get(self, key: str) -> Optional[Any]:
        """Retrieves cached execution result."""
        return self._store.get(key)

    def record(self, key: str, result: Any) -> None:
        """Stores execution output associated with idempotency key."""
        self._store[key] = result
