from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Request
from agent_platform.harness.state.principal import Principal
from agent_platform.api.deps import require_role

router = APIRouter(prefix="/v1", tags=["Tools"])

@router.get("/tools")
async def list_tools_schema(
    request: Request,
    admin_principal: Principal = Depends(require_role("admin")),
) -> List[Dict[str, Any]]:
    """Lists tool definitions and OpenAPI/function schemas for admin audit."""
    harness = request.app.state.harness
    return harness.tool_registry.get_schemas()
