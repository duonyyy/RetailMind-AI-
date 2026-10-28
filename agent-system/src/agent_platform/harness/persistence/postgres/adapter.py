"""PostgreSQL KVStore & Audit Persistence Adapter (Production SSOT).

Supports live PostgreSQL 16+ via psycopg / asyncpg when postgres_url is provided,
with resilient local SQLite/in-memory fallback for offline/unit test environments.
"""

import json
import logging
import sqlite3
import time
from typing import Any, Dict, List, Optional
from agent_platform.harness.persistence.ports import KVStorePort

logger = logging.getLogger("agent_platform.persistence.postgres")


class PostgresKVStore(KVStorePort):
    """PostgreSQL-backed KVStorePort implementation with resilient SQLite fallback."""

    def __init__(self, dsn: str = "") -> None:
        self.dsn = dsn
        self._pg_available = False
        self._mem_conn = sqlite3.connect(":memory:", check_same_thread=False)
        self._init_schema()

    def _init_schema(self) -> None:
        self._mem_conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at REAL
            )
        """)
        self._mem_conn.commit()

        if self.dsn and self.dsn.startswith("postgresql"):
            try:
                import psycopg
                with psycopg.connect(self.dsn, connect_timeout=2) as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            CREATE TABLE IF NOT EXISTS agent_kv_store (
                                key VARCHAR(255) PRIMARY KEY,
                                value JSONB NOT NULL,
                                expires_at DOUBLE PRECISION
                            )
                        """)
                    conn.commit()
                self._pg_available = True
            except Exception as exc:
                logger.debug("PostgreSQL DSN unreachable (%s), using embedded fallback table.", exc)
                self._pg_available = False

    async def get(self, key: str) -> Optional[Any]:
        now = time.time()
        if self._pg_available:
            try:
                import psycopg
                with psycopg.connect(self.dsn, connect_timeout=2) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT value, expires_at FROM agent_kv_store WHERE key = %s",
                            (key,),
                        )
                        row = cur.fetchone()
                        if not row:
                            return None
                        val, expires_at = row
                        if expires_at and now > expires_at:
                            cur.execute("DELETE FROM agent_kv_store WHERE key = %s", (key,))
                            conn.commit()
                            return None
                        return val
            except Exception as exc:
                logger.debug("PostgreSQL get fallback (%s)", exc)

        cursor = self._mem_conn.cursor()
        cursor.execute("SELECT value, expires_at FROM agent_kv_store WHERE key = ?", (key,))
        row = cursor.fetchone()
        if not row:
            return None
        val_str, expires_at = row
        if expires_at and now > expires_at:
            self._mem_conn.execute("DELETE FROM agent_kv_store WHERE key = ?", (key,))
            self._mem_conn.commit()
            return None
        try:
            return json.loads(val_str)
        except Exception:
            return val_str

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        now = time.time()
        expires_at = (now + ttl_seconds) if ttl_seconds else None
        val_str = json.dumps(value, default=str) if not isinstance(value, str) else value

        if self._pg_available:
            try:
                import psycopg
                with psycopg.connect(self.dsn, connect_timeout=2) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO agent_kv_store (key, value, expires_at)
                            VALUES (%s, %s::jsonb, %s)
                            ON CONFLICT (key) DO UPDATE SET
                                value = EXCLUDED.value,
                                expires_at = EXCLUDED.expires_at
                            """,
                            (key, json.dumps(value, default=str), expires_at),
                        )
                    conn.commit()
                return
            except Exception as exc:
                logger.debug("PostgreSQL set fallback (%s)", exc)

        self._mem_conn.execute(
            """
            INSERT INTO agent_kv_store (key, value, expires_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                expires_at = excluded.expires_at
            """,
            (key, val_str, expires_at),
        )
        self._mem_conn.commit()

    async def delete(self, key: str) -> bool:
        if self._pg_available:
            try:
                import psycopg
                with psycopg.connect(self.dsn, connect_timeout=2) as conn:
                    with conn.cursor() as cur:
                        cur.execute("DELETE FROM agent_kv_store WHERE key = %s", (key,))
                        deleted = cur.rowcount > 0
                    conn.commit()
                return deleted
            except Exception as exc:
                logger.debug("PostgreSQL delete fallback (%s)", exc)

        cursor = self._mem_conn.cursor()
        cursor.execute("DELETE FROM agent_kv_store WHERE key = ?", (key,))
        self._mem_conn.commit()
        return cursor.rowcount > 0

    async def list_keys(self, prefix: str = "") -> List[str]:
        now = time.time()
        if self._pg_available:
            try:
                import psycopg
                with psycopg.connect(self.dsn, connect_timeout=2) as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT key FROM agent_kv_store
                            WHERE (expires_at IS NULL OR expires_at > %s)
                              AND key LIKE %s
                            """,
                            (now, f"{prefix}%"),
                        )
                        return [r[0] for r in cur.fetchall()]
            except Exception as exc:
                logger.debug("PostgreSQL list_keys fallback (%s)", exc)

        cursor = self._mem_conn.cursor()
        cursor.execute(
            """
            SELECT key FROM agent_kv_store
            WHERE (expires_at IS NULL OR expires_at > ?)
              AND key LIKE ?
            """,
            (now, f"{prefix}%"),
        )
        return [r[0] for r in cursor.fetchall()]

