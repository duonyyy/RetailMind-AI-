from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from agent_platform.harness.persistence.ports import (
    KVStorePort,
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.harness.guards.pii import PIIMasker

logger = logging.getLogger("agent_platform.hitl.approval_store")


class ApprovalRequest(BaseModel):
    approval_id: str
    thread_id: str
    run_id: str
    tool_name: str
    arguments: Dict[str, Any]
    requester_user_id: Optional[str] = None
    requester_tenant_id: Optional[str] = None
    approver_role: str = "admin"
    status: Literal["pending", "approved", "rejected"] = "pending"
    decision_by: Optional[str] = None
    note: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    resolved_at: Optional[float] = None


class ApprovalStore:
    """
    Manages Human-In-The-Loop approval requests backed by durable storage.

    When backed by `PostgresKVStore`, uses `agent.hitl_approvals` with row-level
    atomic conditional updates (`UPDATE ... WHERE status = 'pending'`) so concurrent
    reviewers cannot overwrite each other and retries never clobber resolved decisions.
    """

    PREFIX = "approval:"

    def __init__(self, kv_store: KVStorePort) -> None:
        self.kv = kv_store
        self._lock = asyncio.Lock()

    def _is_postgres_backed(self) -> bool:
        return hasattr(self.kv, "_connect") and hasattr(self.kv, "schema")

    @staticmethod
    def _row_to_request(row: Any) -> ApprovalRequest:
        args_val = row[6]
        if isinstance(args_val, str):
            try:
                args_val = json.loads(args_val)
            except Exception:
                args_val = {}
        elif not isinstance(args_val, dict):
            args_val = {}
        return ApprovalRequest(
            approval_id=row[0],
            thread_id=row[1],
            run_id=row[2],
            requester_user_id=row[3],
            requester_tenant_id=row[4],
            tool_name=row[5],
            arguments=args_val,
            approver_role=row[7] or "admin",
            status=row[8],
            decision_by=row[9],
            note=row[10],
            created_at=float(row[11]),
            resolved_at=float(row[12]) if row[12] is not None else None,
        )

    async def create_request(
        self,
        thread_id: str,
        run_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        approver_role: str = "admin",
        approval_id: Optional[str] = None,
        requester_user_id: Optional[str] = None,
        requester_tenant_id: Optional[str] = None,
    ) -> ApprovalRequest:
        masked_args = PIIMasker.mask(arguments or {}, fail_closed=False)
        if not isinstance(masked_args, dict):
            masked_args = {}

        if self._is_postgres_backed():
            schema = getattr(self.kv, "schema", "agent")
            now = time.time()
            try:
                with self.kv._connect() as conn:  # type: ignore[attr-defined]
                    with conn.cursor() as cur:
                        if approval_id is None and thread_id and run_id and tool_name:
                            cur.execute(
                                f"""
                                SELECT approval_id, thread_id, run_id, requester_user_id,
                                       requester_tenant_id, tool_name, arguments, approver_role,
                                       status, decision_by, note, created_at, resolved_at
                                FROM {schema}.hitl_approvals
                                WHERE thread_id = %s AND run_id = %s AND tool_name = %s
                                ORDER BY created_at DESC
                                LIMIT 1
                                """,
                                (thread_id, run_id, tool_name),
                            )
                            existing_by_run = cur.fetchone()
                            if existing_by_run is not None:
                                conn.commit()
                                return self._row_to_request(existing_by_run)

                        app_id = approval_id or f"app_{uuid.uuid4().hex[:10]}"
                        cur.execute(
                            f"""
                            INSERT INTO {schema}.hitl_approvals (
                                approval_id, thread_id, run_id, requester_user_id,
                                requester_tenant_id, tool_name, arguments, approver_role,
                                status, decision_by, note, created_at, resolved_at
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, 'pending', NULL, NULL, %s, NULL)
                            ON CONFLICT (approval_id) DO NOTHING
                            RETURNING approval_id, thread_id, run_id, requester_user_id,
                                      requester_tenant_id, tool_name, arguments, approver_role,
                                      status, decision_by, note, created_at, resolved_at
                            """,
                            (
                                app_id,
                                thread_id,
                                run_id,
                                requester_user_id,
                                requester_tenant_id,
                                tool_name,
                                json.dumps(masked_args, default=str),
                                approver_role,
                                now,
                            ),
                        )
                        row = cur.fetchone()
                        if row is None:
                            cur.execute(
                                f"""
                                SELECT approval_id, thread_id, run_id, requester_user_id,
                                       requester_tenant_id, tool_name, arguments, approver_role,
                                       status, decision_by, note, created_at, resolved_at
                                FROM {schema}.hitl_approvals
                                WHERE approval_id = %s
                                """,
                                (app_id,),
                            )
                            row = cur.fetchone()
                            if row is None:
                                raise PersistenceError(
                                    "Failed to create or load HITL approval request."
                                )
                            conn.commit()
                            return self._row_to_request(row)

                        req_obj = self._row_to_request(row)
                        cur.execute(
                            f"""
                            INSERT INTO {schema}.agent_kv_store (key, value, expires_at)
                            VALUES (%s, %s::jsonb, NULL)
                            ON CONFLICT (key) DO NOTHING
                            """,
                            (
                                f"{self.PREFIX}{app_id}",
                                json.dumps(req_obj.model_dump(), default=str),
                            ),
                        )
                    conn.commit()
                    return req_obj
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL create_request failed: %s", safe_msg)
                raise PersistenceError(
                    f"Approval persistence write failed: {safe_msg}"
                ) from exc

        async with self._lock:
            app_id = approval_id or f"app_{uuid.uuid4().hex[:10]}"
            existing = await self.kv.get(f"{self.PREFIX}{app_id}")
            if existing and isinstance(existing, dict):
                return ApprovalRequest(**existing)

            req = ApprovalRequest(
                approval_id=app_id,
                thread_id=thread_id,
                run_id=run_id,
                tool_name=tool_name,
                arguments=masked_args,
                requester_user_id=requester_user_id,
                requester_tenant_id=requester_tenant_id,
                approver_role=approver_role,
            )
            await self.kv.set(f"{self.PREFIX}{app_id}", req.model_dump())
            return req

    async def get_request(self, approval_id: str) -> Optional[ApprovalRequest]:
        if self._is_postgres_backed():
            schema = getattr(self.kv, "schema", "agent")
            try:
                with self.kv._connect() as conn:  # type: ignore[attr-defined]
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            SELECT approval_id, thread_id, run_id, requester_user_id,
                                   requester_tenant_id, tool_name, arguments, approver_role,
                                   status, decision_by, note, created_at, resolved_at
                            FROM {schema}.hitl_approvals
                            WHERE approval_id = %s
                            """,
                            (approval_id,),
                        )
                        row = cur.fetchone()
                        if row is not None:
                            return self._row_to_request(row)
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL get_request failed: %s", safe_msg)
                raise PersistenceError(
                    f"Approval persistence read failed: {safe_msg}"
                ) from exc

        data = await self.kv.get(f"{self.PREFIX}{approval_id}")
        if not data:
            return None
        return ApprovalRequest(**data)

    async def list_pending(self) -> List[ApprovalRequest]:
        if self._is_postgres_backed():
            schema = getattr(self.kv, "schema", "agent")
            try:
                with self.kv._connect() as conn:  # type: ignore[attr-defined]
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            SELECT approval_id, thread_id, run_id, requester_user_id,
                                   requester_tenant_id, tool_name, arguments, approver_role,
                                   status, decision_by, note, created_at, resolved_at
                            FROM {schema}.hitl_approvals
                            WHERE status = 'pending'
                            ORDER BY created_at DESC
                            """
                        )
                        rows = cur.fetchall()
                        return [self._row_to_request(r) for r in rows]
            except PersistenceError:
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL list_pending failed: %s", safe_msg)
                raise PersistenceError(
                    f"Approval queue query failed: {safe_msg}"
                ) from exc

        keys = await self.kv.list_keys(prefix=self.PREFIX)
        pending: List[ApprovalRequest] = []
        for k in keys:
            data = await self.kv.get(k)
            if data and data.get("status") == "pending":
                pending.append(ApprovalRequest(**data))
        return pending

    async def resolve(
        self,
        approval_id: str,
        decision: Literal["approved", "rejected"],
        approver_user_id: str,
        note: str = "",
    ) -> ApprovalRequest:
        if decision not in ("approved", "rejected"):
            raise ValueError(f"Invalid approval decision: {decision!r}")
        if not approver_user_id or not str(approver_user_id).strip():
            raise ValueError("approver_user_id is required to resolve an approval.")

        clean_note = PIIMasker.mask_text(note or "")
        now = time.time()

        if self._is_postgres_backed():
            schema = getattr(self.kv, "schema", "agent")
            try:
                with self.kv._connect() as conn:  # type: ignore[attr-defined]
                    with conn.cursor() as cur:
                        cur.execute(
                            f"""
                            UPDATE {schema}.hitl_approvals
                            SET status = %s,
                                decision_by = %s,
                                note = %s,
                                resolved_at = %s
                            WHERE approval_id = %s
                              AND status = 'pending'
                            RETURNING approval_id, thread_id, run_id, requester_user_id,
                                      requester_tenant_id, tool_name, arguments, approver_role,
                                      status, decision_by, note, created_at, resolved_at
                            """,
                            (decision, approver_user_id, clean_note, now, approval_id),
                        )
                        updated_row = cur.fetchone()
                        if updated_row is None:
                            cur.execute(
                                f"""
                                SELECT status
                                FROM {schema}.hitl_approvals
                                WHERE approval_id = %s
                                """,
                                (approval_id,),
                            )
                            existing = cur.fetchone()
                            conn.rollback()
                            if existing is None:
                                raise KeyError(
                                    f"Approval request '{approval_id}' not found."
                                )
                            raise ValueError(
                                f"Approval request '{approval_id}' is already {existing[0]}."
                            )

                        resolved_req = self._row_to_request(updated_row)
                        cur.execute(
                            f"""
                            INSERT INTO {schema}.agent_kv_store (key, value, expires_at)
                            VALUES (%s, %s::jsonb, NULL)
                            ON CONFLICT (key) DO UPDATE SET
                                value = EXCLUDED.value
                            """,
                            (
                                f"{self.PREFIX}{approval_id}",
                                json.dumps(resolved_req.model_dump(), default=str),
                            ),
                        )
                    conn.commit()
                    return resolved_req
            except (KeyError, ValueError, PersistenceError):
                raise
            except Exception as exc:
                safe_msg = sanitize_persistence_error(exc)
                logger.error("PostgreSQL resolve approval failed: %s", safe_msg)
                raise PersistenceError(
                    f"Approval resolution persistence failed: {safe_msg}"
                ) from exc

        async with self._lock:
            req = await self.get_request(approval_id)
            if not req:
                raise KeyError(f"Approval request '{approval_id}' not found.")
            if req.status != "pending":
                raise ValueError(
                    f"Approval request '{approval_id}' is already {req.status}."
                )

            req.status = decision
            req.decision_by = approver_user_id
            req.note = clean_note
            req.resolved_at = now

            await self.kv.set(f"{self.PREFIX}{approval_id}", req.model_dump())
            return req
