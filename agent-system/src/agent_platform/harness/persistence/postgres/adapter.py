"""PostgreSQL KVStore & Thread Ownership Persistence Adapter (Production SSOT).

Fail-closed design:
- Connects exclusively to PostgreSQL (isolated `agent` schema by default).
- Zero in-memory (`sqlite3 :memory:` or dict) fallback: if PostgreSQL is not configured,
  unreachable, or fails during a read/write/commit, raises `PersistenceError`.
- Scrubs DSNs, credentials, and PII from all logs and error messages.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Dict, List, Optional

from agent_platform.harness.persistence.ports import (
    KVStorePort,
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.harness.persistence.postgres.migrations import (
    validate_sql_identifier,
    with_schema_search_path,
)

logger = logging.getLogger("agent_platform.persistence.postgres")


class PostgresKVStore(KVStorePort):
    """Fail-closed PostgreSQL-backed KVStorePort implementation."""

    def __init__(
        self,
        dsn: str = "",
        schema: str = "agent",
        connect_timeout: int = 3,
    ) -> None:
        self.dsn = (dsn or "").strip()
        self.schema = validate_sql_identifier(schema or "agent", "schema")
        self.connect_timeout = connect_timeout

    def _require_conninfo(self) -> str:
        if not self.dsn or not self.dsn.startswith(("postgres://", "postgresql://")):
            raise PersistenceError(
                "PostgresKVStore requires a valid PostgreSQL DSN; "
                "refusing to fall back to in-memory storage."
            )
        return with_schema_search_path(self.dsn, self.schema)

    def _connect(self):
        import psycopg

        conninfo = self._require_conninfo()
        try:
            return psycopg.connect(
                conninfo,
                connect_timeout=self.connect_timeout,
                autocommit=False,
            )
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL KV connection failed (schema=%s): %s", self.schema, safe_msg)
            raise PersistenceError(f"PostgreSQL KV unavailable: {safe_msg}") from exc

    async def get(self, key: str) -> Optional[Any]:
        now = time.time()
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    if key.startswith("chat_owner:"):
                        thread_id = key.split("chat_owner:", 1)[1]
                        cur.execute(
                            f"""
                            SELECT user_id, tenant_id, role
                            FROM {self.schema}.thread_ownership
                            WHERE thread_id = %s
                            """,
                            (thread_id,),
                        )
                        owner_row = cur.fetchone()
                        if owner_row:
                            return {
                                "user_id": owner_row[0],
                                "tenant_id": owner_row[1],
                            }

                    cur.execute(
                        f"""
                        SELECT value, expires_at
                        FROM {self.schema}.agent_kv_store
                        WHERE key = %s
                        """,
                        (key,),
                    )
                    row = cur.fetchone()
                    if not row:
                        return None
                    val, expires_at = row
                    if expires_at is not None and now > float(expires_at):
                        cur.execute(
                            f"DELETE FROM {self.schema}.agent_kv_store WHERE key = %s",
                            (key,),
                        )
                        conn.commit()
                        return None
                    if isinstance(val, str):
                        try:
                            return json.loads(val)
                        except Exception:
                            return val
                    return val
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL KV get failed for key prefix: %s", safe_msg)
            raise PersistenceError(f"PostgreSQL KV read failed: {safe_msg}") from exc

    async def set(
        self, key: str, value: Any, ttl_seconds: Optional[int] = None
    ) -> None:
        now = time.time()
        expires_at = (now + ttl_seconds) if ttl_seconds else None
        payload_json = json.dumps(value, default=str)

        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    if key.startswith("chat_owner:") and isinstance(value, dict):
                        thread_id = key.split("chat_owner:", 1)[1]
                        user_id = str(value.get("user_id") or "")
                        tenant_id = str(value.get("tenant_id") or "default")
                        role = str(value.get("role") or "user")
                        cur.execute(
                            f"""
                            INSERT INTO {self.schema}.thread_ownership
                                (thread_id, user_id, tenant_id, role, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s)
                            ON CONFLICT (thread_id) DO NOTHING
                            RETURNING user_id, tenant_id
                            """,
                            (thread_id, user_id, tenant_id, role, now, now),
                        )
                        inserted = cur.fetchone()
                        if inserted is None:
                            cur.execute(
                                f"""
                                SELECT user_id, tenant_id
                                FROM {self.schema}.thread_ownership
                                WHERE thread_id = %s
                                """,
                                (thread_id,),
                            )
                            existing = cur.fetchone()
                            if existing and (
                                existing[0] != user_id or existing[1] != tenant_id
                            ):
                                raise PermissionError(
                                    "Cannot overwrite existing thread ownership with a different principal."
                                )

                    cur.execute(
                        f"""
                        INSERT INTO {self.schema}.agent_kv_store (key, value, expires_at)
                        VALUES (%s, %s::jsonb, %s)
                        ON CONFLICT (key) DO UPDATE SET
                            value = EXCLUDED.value,
                            expires_at = EXCLUDED.expires_at
                        """,
                        (key, payload_json, expires_at),
                    )
                conn.commit()
        except (PersistenceError, PermissionError):
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL KV set failed: %s", safe_msg)
            raise PersistenceError(f"PostgreSQL KV write failed: {safe_msg}") from exc

    async def claim_or_verify_thread_owner(
        self,
        thread_id: str,
        user_id: str,
        tenant_id: str,
        role: str = "user",
        ttl_seconds: int = 86400 * 7,
    ) -> Dict[str, Any]:
        """
        Atomically bind a new thread to `(user_id, tenant_id)` or return the existing
        owner without race conditions (`INSERT ... ON CONFLICT DO NOTHING`).
        """
        now = time.time()
        expires_at = now + ttl_seconds if ttl_seconds else None
        owner_doc = {"user_id": user_id, "tenant_id": tenant_id, "role": role}
        owner_key = f"chat_owner:{thread_id}"

        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        INSERT INTO {self.schema}.thread_ownership
                            (thread_id, user_id, tenant_id, role, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (thread_id) DO NOTHING
                        RETURNING user_id, tenant_id, role
                        """,
                        (thread_id, user_id, tenant_id, role, now, now),
                    )
                    inserted = cur.fetchone()
                    if inserted is not None:
                        cur.execute(
                            f"""
                            INSERT INTO {self.schema}.agent_kv_store (key, value, expires_at)
                            VALUES (%s, %s::jsonb, %s)
                            ON CONFLICT (key) DO NOTHING
                            """,
                            (owner_key, json.dumps(owner_doc), expires_at),
                        )
                        conn.commit()
                        return {
                            "user_id": inserted[0],
                            "tenant_id": inserted[1],
                            "role": inserted[2],
                        }

                    cur.execute(
                        f"""
                        SELECT user_id, tenant_id, role
                        FROM {self.schema}.thread_ownership
                        WHERE thread_id = %s
                        """,
                        (thread_id,),
                    )
                    existing = cur.fetchone()
                    conn.commit()
                    if existing is None:
                        raise PersistenceError(
                            "Thread ownership state inconsistent after atomic claim."
                        )
                    return {
                        "user_id": existing[0],
                        "tenant_id": existing[1],
                        "role": existing[2],
                    }
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL thread ownership claim failed: %s", safe_msg)
            raise PersistenceError(
                f"PostgreSQL thread ownership check failed: {safe_msg}"
            ) from exc

    async def delete(self, key: str) -> bool:
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    deleted = False
                    if key.startswith("chat_owner:"):
                        thread_id = key.split("chat_owner:", 1)[1]
                        cur.execute(
                            f"DELETE FROM {self.schema}.thread_ownership WHERE thread_id = %s",
                            (thread_id,),
                        )
                        deleted = cur.rowcount > 0

                    cur.execute(
                        f"DELETE FROM {self.schema}.agent_kv_store WHERE key = %s",
                        (key,),
                    )
                    deleted = deleted or (cur.rowcount > 0)
                conn.commit()
                return deleted
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL KV delete failed: %s", safe_msg)
            raise PersistenceError(f"PostgreSQL KV delete failed: {safe_msg}") from exc

    async def list_keys(self, prefix: str = "") -> List[str]:
        now = time.time()
        try:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"""
                        SELECT key
                        FROM {self.schema}.agent_kv_store
                        WHERE (expires_at IS NULL OR expires_at > %s)
                          AND key LIKE %s
                        ORDER BY key ASC
                        """,
                        (now, f"{prefix}%"),
                    )
                    return [r[0] for r in cur.fetchall()]
        except PersistenceError:
            raise
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL KV list_keys failed: %s", safe_msg)
            raise PersistenceError(f"PostgreSQL KV list_keys failed: {safe_msg}") from exc
