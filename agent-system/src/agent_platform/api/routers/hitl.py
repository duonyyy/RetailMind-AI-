from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, Field
from agent_platform.harness.persistence.ports import PersistenceError
from agent_platform.harness.state.principal import Principal
from agent_platform.api.deps import require_role
from agent_platform.harness.hitl.approval_store import ApprovalRequest

router = APIRouter(prefix="/v1", tags=["HITL Governance"])


class ResolveApprovalRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str = Field(default="", max_length=500)


@router.get("/approvals", response_model=List[ApprovalRequest])
@router.get("/hitl/pending", response_model=List[ApprovalRequest])
async def list_pending_approvals(
    request: Request,
    admin_principal: Principal = Depends(require_role("admin")),
):
    """Lists all pending approval requests in the HITL queue (Admin only)."""
    harness = request.app.state.harness
    try:
        return await harness.approval_store.list_pending()
    except PersistenceError:
        raise HTTPException(
            status_code=503,
            detail="Approval persistence store unavailable.",
        )


@router.post("/approvals/{approval_id}", response_model=ApprovalRequest)
@router.post("/hitl/{approval_id}/approve", response_model=ApprovalRequest)
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
    decision = body.decision if body else "approved"
    note = body.note if body else ""
    try:
        result = await harness.resolve_and_resume_hitl(
            approval_id=approval_id,
            decision=decision,
            approver_user_id=admin_principal.user_id,
            note=note,
        )
        return result["approval"]
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found.")
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


@router.post("/hitl/{approval_id}/reject", response_model=ApprovalRequest)
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
        body=ResolveApprovalRequest(decision="rejected", note=note),
        admin_principal=admin_principal,
    )
