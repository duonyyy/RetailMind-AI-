from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from agent_platform.harness.persistence.ports import PersistenceError
from agent_platform.harness.state.principal import Principal
from agent_platform.api.deps import require_role
from agent_platform.harness.hitl.approval_store import ApprovalRequest

router = APIRouter(prefix="/v1", tags=["HITL Governance"])


class ResolveApprovalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["approved", "rejected"]
    note: str = Field(default="", max_length=500)
    reviewer: Optional[str] = None


@router.get("/approvals", response_model=List[ApprovalRequest], response_model_exclude={"__all__": {"arguments"}})
@router.get("/hitl/pending", response_model=List[ApprovalRequest], response_model_exclude={"__all__": {"arguments"}})
async def list_pending_approvals(
    request: Request,
    admin_principal: Principal = Depends(require_role("admin")),
):
    """Lists all pending approval requests in the HITL queue (Admin only)."""
    harness = request.app.state.harness
    try:
        pending = await harness.approval_store.list_pending()
        return [item for item in pending if item.requester_user_id and item.requester_tenant_id == admin_principal.tenant_id]
    except PersistenceError:
        raise HTTPException(
            status_code=503,
            detail="Approval persistence store unavailable.",
        )


@router.post("/approvals/{approval_id}", response_model=ApprovalRequest, response_model_exclude={"arguments"})
@router.post("/hitl/{approval_id}/approve", response_model=ApprovalRequest, response_model_exclude={"arguments"})
async def resolve_approval(
    approval_id: str,
    request: Request,
    body: Optional[ResolveApprovalRequest] = None,
    admin_principal: Principal = Depends(require_role("admin")),
):
    """
    Resolves a pending approval and resumes deferred tool execution (Admin only).
    Fixes A5: Authenticated resolution with idempotency and tamper-evident audit trail.
    """
    harness = request.app.state.harness
    if body and body.reviewer is not None and body.reviewer != admin_principal.user_id:
        raise HTTPException(status_code=403, detail="Reviewer must match the authenticated user.")
    decision = body.decision if body else "approved"
    note = body.note if body else ""
    try:
        result = await harness.resolve_and_resume_hitl(
            approval_id=approval_id,
            decision=decision,
            approver=admin_principal,
            note=note,
        )
        return result["approval"]
    except KeyError:
        raise HTTPException(status_code=404, detail="Approval request not found.")
    except PermissionError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        msg = str(e)
        status_code = 409 if "already " in msg.lower() else 400
        raise HTTPException(status_code=status_code, detail=msg)
    except PersistenceError:
        raise HTTPException(
            status_code=503,
            detail="Approval persistence store unavailable; decision was not committed.",
        )


@router.post("/hitl/{approval_id}/reject", response_model=ApprovalRequest, response_model_exclude={"arguments"})
async def reject_approval_v1(
    approval_id: str,
    request: Request,
    body: Optional[ResolveApprovalRequest] = None,
    admin_principal: Principal = Depends(require_role("admin")),
):
    """Direct rejection endpoint under /v1/hitl/{approval_id}/reject (Admin only)."""
    note = body.note if body else ""
    return await resolve_approval(
        approval_id=approval_id,
        request=request,
        body=ResolveApprovalRequest(decision="rejected", note=note, reviewer=body.reviewer if body else None),
        admin_principal=admin_principal,
    )
