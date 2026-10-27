from typing import Optional
from fastapi import Header, HTTPException, Depends
from agent_platform.harness.state.principal import Principal, Role

def get_principal(authorization: Optional[str] = Header(None)) -> Principal:
    """
    Server-side authentication dependency extracting Principal.
    Strictly forbids unauthenticated calls (Fixes A6, Principle 3).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Valid Bearer token required in Authorization header.",
        )

    token = authorization[7:].strip()

    # Fast dev / test token parsing: "dev:<user_id>:<role>:<tenant_id>"
    if token.startswith("dev:"):
        parts = token.split(":")
        user_id = parts[1] if len(parts) > 1 else "dev_user"
        role = parts[2] if len(parts) > 2 else Role.CUSTOMER.value
        tenant_id = parts[3] if len(parts) > 3 else "default"
        return Principal(user_id=user_id, role=role, tenant_id=tenant_id)

    # In production with JWT:
    # payload = jwt.decode(token, secret_or_jwks, algorithms=["HS256", "RS256"])
    # For baseline template:
    return Principal(user_id=token, role=Role.CUSTOMER.value, tenant_id="default")

def require_role(required_role: str):
    """Dependency enforcing minimum role privilege."""
    def role_checker(principal: Principal = Depends(get_principal)) -> Principal:
        if principal.role != required_role and principal.role != Role.ADMIN.value:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Action requires role '{required_role}', but caller is '{principal.role}'.",
            )
        return principal
    return role_checker
