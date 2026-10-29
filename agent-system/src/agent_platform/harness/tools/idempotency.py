from __future__ import annotations

import hashlib
import json
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional

from agent_platform.harness.persistence.ports import (
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.harness.persistence.postgres.migrations import (
    validate_sql_identifier,
    with_schema_search_path,
)
from agent_platform.harness.guards.pii import PIIMasker

logger = logging.getLogger("agent_platform.tools.idempotency")


@dataclass
class IdempotencyReservation:
    action: Literal["proceed", "replay", "conflict", "in_progress", "unknown_outcome"]
    output: Optional[Any] = None
    error_code: Optional[str] = None
    message: Optional[str] = None


class IdempotencyManager:
    """
    Manages idempotent side-effect tool execution across restarts and concurrent workers.

    Modes:
    - `adapter="postgres"`: Durable PostgreSQL storage in `{schema}.tool_idempotency`
      with `UNIQUE (idempotency_key)` constraint and fail-closed error handling.
    - `adapter="memory"`: In-memory state machine for isolated unit tests.

    State Machine:
    - `in_progress`: Active execution; concurrent duplicate calls are rejected (`idempotency_in_progress`).
    - `completed`: Confirmed completion; subsequent calls with identical payload & principal replay cached output.
    - `unknown_outcome`: Timeout or connection drop after backend dispatch; automatic retry is blocked
      (`unknown_outcome`) to prevent duplicate side effects.
    - Definite failure before commit (connect error before send, or explicit backend rejection)
      aborts the `in_progress` reservation so errors are never cached as success.
    """

    def __init__(
        self,
        dsn: str = "",
        schema: str = "agent",
        adapter: str = "memory",
        connect_timeout: int = 3,
        ttl_seconds: int = 86400 * 7,
    ) -> None:
        self.dsn = (dsn or "").strip()
        self.schema = validate_sql_identifier(schema or "agent", "schema")
        self.adapter = (adapter or ("postgres" if self.dsn else "memory")).strip().lower()
        self.connect_timeout = connect_timeout
        self.ttl_seconds = ttl_seconds

        # In-memory structures (used ONLY when adapter == "memory")
        # `_store` maps key -> completed output (kept for unit test compatibility)
        self._store: Dict[str, Any] = {}
        self._records: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _is_postgres(self) -> bool:
        return self.adapter == "postgres"

    def _connect(self):
        import psycopg

        if not self.dsn or not self.dsn.startswith(("postgres://", "postgresql://")):
            raise PersistenceError(
                "PostgreSQL IdempotencyManager requires a valid postgres_url; "
                "refusing to fall back to in-memory dictionary."
            )
        conninfo = with_schema_search_path(self.dsn, self.schema)
        try:
            return psycopg.connect(
                conninfo,
                connect_timeout=self.connect_timeout,
                autocommit=False,
            )
        except Exception as exc:
            safe_msg = sanitize_persistence_error(exc)
            logger.error("PostgreSQL idempotency connection failed: %s", safe_msg)
            raise PersistenceError(
                f"PostgreSQL idempotency store unavailable: {safe_msg}"
            ) from exc

    @staticmethod
    def generate_key(thread_id: str, tool_call_id: str) -> str:
        """Computes a deterministic idempotency key from thread_id and tool_call_id."""
        raw = f"{thread_id}:{tool_call_id}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    @staticmethod
    def compute_payload_hash(arguments: Dict[str, Any]) -> str:
        """
        Computes a normalized SHA-256 fingerprint of PII-masked tool arguments.
        Raw PII is never stored or needed for payload equivalence checks.
        """
        masked_args = PIIMasker.mask(arguments or {}, fail_closed=False)
        canonical = json.dumps(
            masked_args,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
            ensure_ascii=False,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    def begin_execution(
        self,
        key: str,
        *,
        tenant_id: str = "default",
        user_id: str = "",
        thread_id: str = "default_thread",
        tool_name: str = "",
        call_id: str = "default_call",
        arguments: Optional[Dict[str, Any]] = None,
        payload_hash: Optional[str] = None,
        backend_idempotency_key: Optional[str] = None,
    ) -> IdempotencyReservation:
        """
        Atomically reserves `key` as `in_progress` or inspects existing record.
        """
        p_hash = payload_hash or self.compute_payload_hash(arguments or {})
        b_key = backend_idempotency_key or key
        # Distinct tool call IDs can represent the same uncertain operation.
        # Serialize reservations for a principal, tool and payload across replicas.
        operation_scope = json.dumps([tenant_id, user_id, tool_name, p_hash], ensure_ascii=False, separators=(",", ":"))
        now = time.time()
        expires_at = now + self.ttl_seconds if self.ttl_seconds else None

        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (operation_scope,))
                        cur.execute(
                            f"""
                            SELECT status FROM {self.schema}.tool_idempotency
                            WHERE tenant_id = %s AND user_id = %s AND tool_name = %s
                              AND payload_hash = %s AND idempotency_key <> %s
                              AND status IN ('in_progress', 'unknown_outcome')
                            LIMIT 1
                            """,
                            (tenant_id, user_id, tool_name, p_hash, key),
                        )
                        unresolved = cur.fetchone()
                        if unresolved:
                            conn.commit()
                            return IdempotencyReservation(
                                action="unknown_outcome",
                                error_code="unknown_outcome",
                                message="Thao tác tương tự chưa được xác nhận; cần đối soát trước khi thực hiện lại.",
                            )
                        cur.execute(
                            f"""
                            INSERT INTO {self.schema}.tool_idempotency (
                                idempotency_key, tenant_id, user_id, thread_id,
                                tool_name, call_id, payload_hash, backend_idempotency_key,
                                status, response_output, is_error, error_code,
                                created_at, updated_at, expires_at
                            )
                            VALUES (
                                %s, %s, %s, %s,
                                %s, %s, %s, %s,
                                'in_progress', NULL, FALSE, NULL,
                                %s, %s, %s
                            )
                            ON CONFLICT (idempotency_key) DO NOTHING
                            RETURNING idempotency_key
                            """,
                            (
                                key,
                                tenant_id,
                                user_id,
                                thread_id,
                                tool_name,
                                call_id,
                                p_hash,
                                b_key,
                                now,
                                now,
                                expires_at,
                            ),
                        )
                        inserted = cur.fetchone()
                        if inserted is not None:
                            conn.commit()
                            return IdempotencyReservation(action="proceed")

                        cur.execute(
                            f"""
                            SELECT tenant_id, user_id, tool_name, payload_hash,
                                   status, response_output, error_code
                            FROM {self.schema}.tool_idempotency
                            WHERE idempotency_key = %s
                            """,
                            (key,),
                        )
                        row = cur.fetchone()
                        conn.commit()
                        if row is None:
                            raise PersistenceError(
                                "Idempotency record disappeared during conflict check."
                            )

                        (
                            ex_tenant,
                            ex_user,
                            ex_tool,
                            ex_hash,
                            ex_status,
                            ex_output,
                            ex_err_code,
                        ) = row

                        if (
                            ex_tenant != tenant_id
                            or ex_user != user_id
                            or (ex_tool and tool_name and ex_tool != tool_name)
                            or ex_hash != p_hash
                        ):
                            return IdempotencyReservation(
                                action="conflict",
                                error_code="idempotency_conflict",
                                message=(
                                    "Idempotency conflict: key already bound to a different "
                                    "payload, tool, or principal."
                                ),
                            )

                        if ex_status == "completed":
                            return IdempotencyReservation(
                                action="replay",
                                output=ex_output,
                            )

                        if ex_status == "in_progress":
                            return IdempotencyReservation(
                                action="in_progress",
                                error_code="idempotency_in_progress",
                                message="Thao tác đang được xử lý đồng thời; vui lòng chờ kết quả.",
                            )

                        return IdempotencyReservation(
                            action="unknown_outcome",
                            error_code="unknown_outcome",
                            message=(
                                "Trạng thái thao tác trước đó chưa xác nhận được sau khi gửi yêu cầu "
                                "(timeout/mất kết nối); từ chối tự động chạy lại để tránh trùng lặp tác dụng phụ."
                            ),
                        )
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL idempotency begin_execution failed: %s", safe_msg)
                raise PersistenceError(
                    f"Idempotency reservation failed: {safe_msg}"
                ) from exc

        with self._lock:
            existing = self._records.get(key)
            if any(
                other_key != key
                and record.get("tenant_id") == tenant_id
                and record.get("user_id") == user_id
                and record.get("tool_name") == tool_name
                and record.get("payload_hash") == p_hash
                and record.get("status") in ("in_progress", "unknown_outcome")
                for other_key, record in self._records.items()
            ):
                return IdempotencyReservation(
                    action="unknown_outcome",
                    error_code="unknown_outcome",
                    message="Thao tác tương tự chưa được xác nhận; cần đối soát trước khi thực hiện lại.",
                )
            if existing is None and key in self._store:
                return IdempotencyReservation(
                    action="replay",
                    output=self._store[key],
                )
            if existing is None:
                self._records[key] = {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "thread_id": thread_id,
                    "tool_name": tool_name,
                    "call_id": call_id,
                    "payload_hash": p_hash,
                    "backend_idempotency_key": b_key,
                    "status": "in_progress",
                    "response_output": None,
                    "error_code": None,
                    "created_at": now,
                    "updated_at": now,
                }
                return IdempotencyReservation(action="proceed")

            if (
                existing.get("tenant_id") != tenant_id
                or existing.get("user_id") != user_id
                or (
                    existing.get("tool_name")
                    and tool_name
                    and existing.get("tool_name") != tool_name
                )
                or existing.get("payload_hash") != p_hash
            ):
                return IdempotencyReservation(
                    action="conflict",
                    error_code="idempotency_conflict",
                    message=(
                        "Idempotency conflict: key already bound to a different "
                        "payload, tool, or principal."
                    ),
                )

            st = existing.get("status")
            if st == "completed":
                return IdempotencyReservation(
                    action="replay",
                    output=existing.get("response_output"),
                )
            if st == "in_progress":
                return IdempotencyReservation(
                    action="in_progress",
                    error_code="idempotency_in_progress",
                    message="Thao tác đang được xử lý đồng thời; vui lòng chờ kết quả.",
                )
            return IdempotencyReservation(
                action="unknown_outcome",
                error_code="unknown_outcome",
                message=(
                    "Trạng thái thao tác trước đó chưa xác nhận được sau khi gửi yêu cầu "
                    "(timeout/mất kết nối); từ chối tự động chạy lại để tránh trùng lặp tác dụng phụ."
                ),
            )

    def complete_execution(self, key: str, result: Any) -> None:
        """Marks an `in_progress` reservation as `completed` and stores the sanitized output."""
        now = time.time()
        output_str = result if isinstance(result, str) else json.dumps(result, default=str)

        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            UPDATE {self.schema}.tool_idempotency
                            SET status = 'completed',
                                response_output = %s,
                                is_error = FALSE,
                                error_code = NULL,
                                updated_at = %s
                            WHERE idempotency_key = %s
                            """,
                            (output_str, now, key),
                        )
                        if cur.rowcount == 0:
                            cur.execute(
                                f"""
                                INSERT INTO {self.schema}.tool_idempotency (
                                    idempotency_key, tenant_id, user_id, thread_id,
                                    tool_name, call_id, payload_hash, backend_idempotency_key,
                                    status, response_output, is_error, error_code,
                                    created_at, updated_at
                                )
                                VALUES (
                                    %s, 'default', '', 'default_thread',
                                    '', %s, %s, %s,
                                    'completed', %s, FALSE, NULL,
                                    %s, %s
                                )
                                ON CONFLICT (idempotency_key) DO UPDATE SET
                                    status = 'completed',
                                    response_output = EXCLUDED.response_output,
                                    is_error = FALSE,
                                    error_code = NULL,
                                    updated_at = EXCLUDED.updated_at
                                """,
                                (
                                    key,
                                    key[:32],
                                    hashlib.sha256(b"{}").hexdigest(),
                                    key,
                                    output_str,
                                    now,
                                    now,
                                ),
                            )
                    conn.commit()
                return
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL idempotency complete_execution failed: %s", safe_msg)
                raise PersistenceError(
                    f"Idempotency completion write failed: {safe_msg}"
                ) from exc

        with self._lock:
            self._store[key] = result
            if key in self._records:
                self._records[key]["status"] = "completed"
                self._records[key]["response_output"] = result
                self._records[key]["updated_at"] = now
            else:
                self._records[key] = {
                    "tenant_id": "default",
                    "user_id": "",
                    "thread_id": "default_thread",
                    "tool_name": "",
                    "call_id": "",
                    "payload_hash": self.compute_payload_hash({}),
                    "backend_idempotency_key": key,
                    "status": "completed",
                    "response_output": result,
                    "error_code": None,
                    "created_at": now,
                    "updated_at": now,
                }

    def mark_unknown_outcome(self, key: str, error_code: str = "unknown_outcome") -> None:
        """
        Marks an `in_progress` reservation as `unknown_outcome` when a timeout or
        connection drop happens after backend dispatch. Never caches as completed success.
        """
        now = time.time()
        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            UPDATE {self.schema}.tool_idempotency
                            SET status = 'unknown_outcome',
                                is_error = TRUE,
                                error_code = %s,
                                updated_at = %s
                            WHERE idempotency_key = %s
                            """,
                            (error_code, now, key),
                        )
                    conn.commit()
                return
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL idempotency mark_unknown_outcome failed: %s", safe_msg)
                raise PersistenceError(
                    f"Idempotency unknown_outcome write failed: {safe_msg}"
                ) from exc

        with self._lock:
            self._store.pop(key, None)
            if key in self._records:
                self._records[key]["status"] = "unknown_outcome"
                self._records[key]["error_code"] = error_code
                self._records[key]["updated_at"] = now

    def abort_execution(self, key: str) -> None:
        """
        Removes an `in_progress` reservation when a definite pre-commit failure
        occurs (e.g., connect error before send or explicit backend error response).
        """
        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            DELETE FROM {self.schema}.tool_idempotency
                            WHERE idempotency_key = %s
                              AND status = 'in_progress'
                            """,
                            (key,),
                        )
                    conn.commit()
                return
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL idempotency abort_execution failed: %s", safe_msg)
                raise PersistenceError(
                    f"Idempotency abort write failed: {safe_msg}"
                ) from exc

        with self._lock:
            self._store.pop(key, None)
            existing = self._records.get(key)
            if existing and existing.get("status") == "in_progress":
                self._records.pop(key, None)

    def get_record(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieves full idempotency metadata record for inspection/testing."""
        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            SELECT idempotency_key, tenant_id, user_id, thread_id,
                                   tool_name, call_id, payload_hash, backend_idempotency_key,
                                   status, response_output, is_error, error_code
                            FROM {self.schema}.tool_idempotency
                            WHERE idempotency_key = %s
                            """,
                            (key,),
                        )
                        row = cur.fetchone()
                        if not row:
                            return None
                        return {
                            "idempotency_key": row[0],
                            "tenant_id": row[1],
                            "user_id": row[2],
                            "thread_id": row[3],
                            "tool_name": row[4],
                            "call_id": row[5],
                            "payload_hash": row[6],
                            "backend_idempotency_key": row[7],
                            "status": row[8],
                            "response_output": row[9],
                            "is_error": row[10],
                            "error_code": row[11],
                        }
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                raise PersistenceError(
                    f"Idempotency get_record failed: {safe_msg}"
                ) from exc

        with self._lock:
            rec = self._records.get(key)
            return dict(rec) if rec else None

    def has(self, key: str) -> bool:
        """Checks if a completed result already exists for `key`."""
        if self._is_postgres():
            rec = self.get_record(key)
            return bool(rec and rec.get("status") == "completed")
        with self._lock:
            return key in self._store

    def get(self, key: str) -> Optional[Any]:
        """Retrieves cached completed execution result."""
        if self._is_postgres():
            rec = self.get_record(key)
            if rec and rec.get("status") == "completed":
                return rec.get("response_output")
            return None
        with self._lock:
            return self._store.get(key)

    def record(self, key: str, result: Any) -> None:
        """Stores completed execution output associated with idempotency key."""
        self.complete_execution(key, result)
