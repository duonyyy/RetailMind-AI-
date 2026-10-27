import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Optional, Dict, List
from agent_platform.harness.persistence.ports import KVStorePort

class SqliteKVStore(KVStorePort):
    """SQLite-backed KVStore adapter for single-node local execution."""

    def __init__(self, db_path: str = "agent_data.db") -> None:
        self.db_path = str(Path(db_path).resolve())
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS kv_store (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    expires_at REAL
                )
            """)
            conn.commit()

    async def get(self, key: str) -> Optional[Any]:
        now = time.time()
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value, expires_at FROM kv_store WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                return None
            val_str, expires_at = row
            if expires_at and now > expires_at:
                conn.execute("DELETE FROM kv_store WHERE key = ?", (key,))
                conn.commit()
                return None
            try:
                return json.loads(val_str)
            except Exception:
                return val_str

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        now = time.time()
        expires_at = (now + ttl_seconds) if ttl_seconds else None
        val_str = json.dumps(value, default=str) if not isinstance(value, str) else value
        with self._get_conn() as conn:
            conn.execute("""
                INSERT INTO kv_store (key, value, expires_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    expires_at = excluded.expires_at
            """, (key, val_str, expires_at))
            conn.commit()

    async def delete(self, key: str) -> bool:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM kv_store WHERE key = ?", (key,))
            conn.commit()
            return cursor.rowcount > 0

    async def list_keys(self, prefix: str = "") -> List[str]:
        now = time.time()
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT key FROM kv_store
                WHERE (expires_at IS NULL OR expires_at > ?)
                  AND key LIKE ?
            """, (now, f"{prefix}%"))
            rows = cursor.fetchall()
            return [r[0] for r in rows]
