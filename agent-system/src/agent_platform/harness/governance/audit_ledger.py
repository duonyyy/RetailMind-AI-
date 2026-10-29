from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from agent_platform.harness.persistence.ports import (
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.harness.persistence.postgres.migrations import (
    validate_sql_identifier,
    with_schema_search_path,
)
from agent_platform.harness.guards.pii import PIIMasker

logger = logging.getLogger("agent_platform.governance.audit_ledger")


class AuditEvent(BaseModel):
    event_id: str
    timestamp: float = Field(default_factory=time.time)
    thread_id: str
    user_id: str
    role: str
    tenant_id: str
    tool_name: str
    input_masked: Dict[str, Any]
    decision: str
    approver: Optional[str] = None
    prev_hash: str
    current_hash: str


class TamperEvidentHashChainLedger:
    """
    Append-only tamper-evident audit ledger using SHA-256 cryptographic chaining.

    Persistence & Integrity Boundary:
    - When `adapter="postgres"`, events are persisted durably in `{schema}.audit_events`
      under a transaction-scoped advisory lock (`pg_advisory_xact_lock`) so the hash chain
      is continuous across restarts and concurrent workers.
    - The runtime database role (`retailmind_agent_runtime`) is granted only `SELECT, INSERT`
      (no `UPDATE`, `DELETE`, or `TRUNCATE`) on `{schema}.audit_events`.
    - Limitation: SHA-256 chaining without an external HSM/WORM anchor detects single-row
      tampering and prevents runtime role mutation, but cannot prevent a PostgreSQL superuser
      from rewriting and re-hashing the entire table.
    - When `adapter="memory"` (unit tests only), events are held in process RAM and do not
      survive process restarts.
    """

    GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

    def __init__(
        self,
        dsn: str = "",
        schema: str = "agent",
        adapter: str = "memory",
        connect_timeout: int = 3,
    ) -> None:
        self.dsn = (dsn or "").strip()
        self.schema = validate_sql_identifier(schema or "agent", "schema")
        self.adapter = (adapter or ("postgres" if self.dsn else "memory")).strip().lower()
        self.connect_timeout = connect_timeout

        self._events: List[AuditEvent] = []
        self._latest_hash = self.GENESIS_HASH

    def _is_postgres(self) -> bool:
        return self.adapter == "postgres"

    def _connect(self):
        import psycopg

        if not self.dsn or not self.dsn.startswith(("postgres://", "postgresql://")):
            raise PersistenceError(
                "PostgreSQL TamperEvidentHashChainLedger requires a valid postgres_url; "
                "refusing to fall back to in-memory audit list."
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
            logger.error("PostgreSQL audit ledger connection failed: %s", safe_msg)
            raise PersistenceError(
                f"PostgreSQL audit ledger unavailable: {safe_msg}"
            ) from exc

    @staticmethod
    def _compute_hash(prev_hash: str, payload: str) -> str:
        raw = f"{prev_hash}:{payload}".encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    @staticmethod
    def _build_payload_str(
        event_id: str,
        thread_id: str,
        user_id: str,
        role: str,
        tenant_id: str,
        tool_name: str,
        input_masked: Dict[str, Any],
        decision: str,
        approver: Optional[str],
    ) -> str:
        payload_dict = {
            "event_id": event_id,
            "thread_id": thread_id,
            "user_id": user_id,
            "role": role,
            "tenant_id": tenant_id,
            "tool_name": tool_name,
            "input_masked": input_masked,
            "decision": decision,
            "approver": approver,
        }
        return json.dumps(payload_dict, sort_keys=True, default=str)

    def record_event(
        self,
        event_id: str,
        thread_id: str,
        user_id: str,
        role: str,
        tenant_id: str,
        tool_name: str,
        input_masked: Dict[str, Any],
        decision: str,
        approver: Optional[str] = None,
    ) -> AuditEvent:
        """Appends an event to the cryptographically linked ledger after enforcing PII masking."""
        truly_masked = PIIMasker.mask(input_masked or {}, fail_closed=False)
        if not isinstance(truly_masked, dict):
            truly_masked = {"value": truly_masked}
        clean_approver = (
            PIIMasker.mask_text(approver)
            if isinstance(approver, str)
            else None
        )
        now = time.time()

        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            "SELECT pg_advisory_xact_lock(hashtext(%s))",
                            (f"{self.schema}.audit_events",),
                        )
                        cur.execute(
                            f"SELECT 1 FROM {self.schema}.audit_events WHERE event_id = %s",
                            (event_id,),
                        )
                        effective_event_id = (
                            f"{event_id}_{uuid.uuid4().hex[:8]}"
                            if cur.fetchone() is not None
                            else event_id
                        )

                        cur.execute(
                            f"""
                            SELECT current_hash
                            FROM {self.schema}.audit_events
                            ORDER BY seq DESC
                            LIMIT 1
                            """
                        )
                        last_row = cur.fetchone()
                        prev_hash = last_row[0] if last_row else self.GENESIS_HASH

                        payload_str = self._build_payload_str(
                            event_id=effective_event_id,
                            thread_id=thread_id,
                            user_id=user_id,
                            role=role,
                            tenant_id=tenant_id,
                            tool_name=tool_name,
                            input_masked=truly_masked,
                            decision=decision,
                            approver=clean_approver,
                        )
                        current_hash = self._compute_hash(prev_hash, payload_str)

                        cur.execute(
                            f"""
                            INSERT INTO {self.schema}.audit_events (
                                event_id, timestamp, thread_id, user_id, role,
                                tenant_id, tool_name, input_masked, decision,
                                approver, prev_hash, current_hash
                            )
                            VALUES (
                                %s, %s, %s, %s, %s,
                                %s, %s, %s::jsonb, %s,
                                %s, %s, %s
                            )
                            """,
                            (
                                effective_event_id,
                                now,
                                thread_id,
                                user_id,
                                role,
                                tenant_id,
                                tool_name,
                                json.dumps(truly_masked, default=str),
                                decision,
                                clean_approver,
                                prev_hash,
                                current_hash,
                            ),
                        )
                    conn.commit()

                event = AuditEvent(
                    event_id=effective_event_id,
                    timestamp=now,
                    thread_id=thread_id,
                    user_id=user_id,
                    role=role,
                    tenant_id=tenant_id,
                    tool_name=tool_name,
                    input_masked=truly_masked,
                    decision=decision,
                    approver=clean_approver,
                    prev_hash=prev_hash,
                    current_hash=current_hash,
                )
                self._latest_hash = current_hash
                return event
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL audit record_event failed: %s", safe_msg)
                raise PersistenceError(
                    f"Audit event persistence failed: {safe_msg}"
                ) from exc

        payload_str = self._build_payload_str(
            event_id=event_id,
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            tenant_id=tenant_id,
            tool_name=tool_name,
            input_masked=truly_masked,
            decision=decision,
            approver=clean_approver,
        )
        current_hash = self._compute_hash(self._latest_hash, payload_str)

        event = AuditEvent(
            event_id=event_id,
            timestamp=now,
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            tenant_id=tenant_id,
            tool_name=tool_name,
            input_masked=truly_masked,
            decision=decision,
            approver=clean_approver,
            prev_hash=self._latest_hash,
            current_hash=current_hash,
        )

        self._events.append(event)
        self._latest_hash = current_hash
        return event

    def get_events(self, thread_id: Optional[str] = None) -> List[AuditEvent]:
        if self._is_postgres():
            try:
                with self._connect() as conn:
                    with conn.cursor() as cur:
                        if thread_id:
                            cur.execute(
                                f"""
                                SELECT event_id, timestamp, thread_id, user_id, role,
                                       tenant_id, tool_name, input_masked, decision,
                                       approver, prev_hash, current_hash
                                FROM {self.schema}.audit_events
                                WHERE thread_id = %s
                                ORDER BY seq ASC
                                """,
                                (thread_id,),
                            )
                        else:
                            cur.execute(
                                f"""
                                SELECT event_id, timestamp, thread_id, user_id, role,
                                       tenant_id, tool_name, input_masked, decision,
                                       approver, prev_hash, current_hash
                                FROM {self.schema}.audit_events
                                ORDER BY seq ASC
                                """
                            )
                        rows = cur.fetchall()
                        events: List[AuditEvent] = []
                        for r in rows:
                            inp = r[7]
                            if isinstance(inp, str):
                                try:
                                    inp = json.loads(inp)
                                except Exception:
                                    inp = {}
                            elif not isinstance(inp, dict):
                                inp = {}
                            events.append(
                                AuditEvent(
                                    event_id=r[0],
                                    timestamp=float(r[1]),
                                    thread_id=r[2],
                                    user_id=r[3],
                                    role=r[4],
                                    tenant_id=r[5],
                                    tool_name=r[6],
                                    input_masked=inp,
                                    decision=r[8],
                                    approver=r[9],
                                    prev_hash=r[10],
                                    current_hash=r[11],
                                )
                            )
                        return events
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL audit get_events failed: %s", safe_msg)
                raise PersistenceError(
                    f"Audit event read failed: {safe_msg}"
                ) from exc

        if thread_id:
            return [e for e in self._events if e.thread_id == thread_id]
        return list(self._events)

    def verify_integrity(self, events: Optional[List[AuditEvent]] = None) -> bool:
        """Verifies that the hash chain is unbroken and free of tampering."""
        target_events = (
            events
            if events is not None
            else (self.get_events() if self._is_postgres() else self._events)
        )
        prev = self.GENESIS_HASH
        for ev in target_events:
            if ev.prev_hash != prev:
                return False
            payload_str = self._build_payload_str(
                event_id=ev.event_id,
                thread_id=ev.thread_id,
                user_id=ev.user_id,
                role=ev.role,
                tenant_id=ev.tenant_id,
                tool_name=ev.tool_name,
                input_masked=ev.input_masked,
                decision=ev.decision,
                approver=ev.approver,
            )
            recalculated = self._compute_hash(prev, payload_str)
            if recalculated != ev.current_hash:
                return False
            prev = ev.current_hash
        return True
