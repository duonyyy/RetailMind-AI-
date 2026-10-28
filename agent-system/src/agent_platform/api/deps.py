"""Identity and session boundaries shared by every public agent router."""
import os
import uuid
from typing import Optional

import httpx
from fastapi import Depends, Header, HTTPException, Request

from agent_platform.harness.state.principal import Principal, Role


async def get_optional_principal(
    request: Request, authorization: Optional[str] = Header(None)
) -> Principal:
    if authorization is None:
        # Anonymous identity is server-generated and cannot claim another session.
        return Principal(user_id=f"guest_{uuid.uuid4().hex}", role=Role.GUEST.value)
    if not authorization.startswith("Bearer ") or not authorization[7:].strip():
        raise HTTPException(status_code=401, detail="Unauthorized: invalid Bearer token.")

    base_url = os.getenv("CORE_API_URL", "http://localhost:4000").rstrip("/")
    transport = getattr(request.app.state, "identity_transport", None)
    try:
        async with httpx.AsyncClient(timeout=3.0, transport=transport, follow_redirects=False) as client:
            response = await client.get(
                f"{base_url}/api/v1/auth/me", headers={"Authorization": authorization}
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Identity service unavailable.")
    if response.status_code in (401, 403):
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or inactive identity.")
    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Identity service unavailable.")
    try:
        profile = response.json()
        if isinstance(profile, dict) and "data" in profile:
            profile = profile["data"]
        user_id = profile["id"]
        role = profile["role"]
        if not isinstance(user_id, str) or not user_id.strip() or not isinstance(role, str):
            raise ValueError("Invalid profile")
        role = role.lower()
        if role not in (Role.CUSTOMER.value, Role.ADMIN.value):
            raise ValueError("Invalid role")
    except (ValueError, TypeError, KeyError):
        raise HTTPException(status_code=503, detail="Invalid identity service response.")
    return Principal(user_id=user_id, role=role, tenant_id="default")


async def get_principal(principal: Principal = Depends(get_optional_principal)) -> Principal:
    if principal.role == Role.GUEST.value:
        raise HTTPException(status_code=401, detail="Unauthorized: authentication required.")
    return principal


def require_role(required_role: str):
    async def role_checker(principal: Principal = Depends(get_principal)) -> Principal:
        if principal.role != required_role and principal.role != Role.ADMIN.value:
            raise HTTPException(status_code=403, detail="Forbidden: insufficient privileges.")
        return principal
    return role_checker


async def owned_thread(request: Request, principal: Principal, thread_id: Optional[str]) -> str:
    """Only server-created session IDs can be resumed by their authenticated owner."""
    store = request.app.state.harness.kv_store
    if thread_id:
        if principal.role == Role.GUEST.value:
            raise HTTPException(status_code=403, detail="Anonymous sessions cannot be resumed.")
        owner = await store.get(f"chat_owner:{thread_id}")
        if not owner or owner != {"user_id": principal.user_id, "tenant_id": principal.tenant_id}:
            raise HTTPException(status_code=404, detail="Chat session not found.")
        return thread_id
    thread_id = f"thread_{uuid.uuid4().hex}"
    if principal.role != Role.GUEST.value:
        await store.set(f"chat_owner:{thread_id}", {"user_id": principal.user_id, "tenant_id": principal.tenant_id})
    return thread_id
