import time
import uuid
from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field
from agent_platform.harness.persistence.ports import KVStorePort

class ApprovalRequest(BaseModel):
    approval_id: str
    thread_id: str
    run_id: str
    tool_name: str
    arguments: Dict[str, Any]
    approver_role: str = "admin"
    status: Literal["pending", "approved", "rejected"] = "pending"
    decision_by: Optional[str] = None
    note: Optional[str] = None
    created_at: float = Field(default_factory=time.time)
    resolved_at: Optional[float] = None

class ApprovalStore:
    """Manages Human-In-The-Loop approval requests backed by durable KVStorePort."""

    PREFIX = "approval:"

    def __init__(self, kv_store: KVStorePort) -> None:
        self.kv = kv_store

    async def create_request(
        self,
        thread_id: str,
        run_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        approver_role: str = "admin",
        approval_id: Optional[str] = None,
    ) -> ApprovalRequest:
        app_id = approval_id or f"app_{uuid.uuid4().hex[:10]}"
        req = ApprovalRequest(
            approval_id=app_id,
            thread_id=thread_id,
            run_id=run_id,
            tool_name=tool_name,
            arguments=arguments,
            approver_role=approver_role,
        )
        await self.kv.set(f"{self.PREFIX}{app_id}", req.model_dump())
        return req

    async def get_request(self, approval_id: str) -> Optional[ApprovalRequest]:
        data = await self.kv.get(f"{self.PREFIX}{approval_id}")
        if not data:
            return None
        return ApprovalRequest(**data)

    async def list_pending(self) -> List[ApprovalRequest]:
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
        req = await self.get_request(approval_id)
        if not req:
            raise KeyError(f"Approval request '{approval_id}' not found.")
        if req.status != "pending":
            raise ValueError(f"Approval request '{approval_id}' is already {req.status}.")

        req.status = decision
        req.decision_by = approver_user_id
        req.note = note
        req.resolved_at = time.time()

        await self.kv.set(f"{self.PREFIX}{approval_id}", req.model_dump())
        return req
