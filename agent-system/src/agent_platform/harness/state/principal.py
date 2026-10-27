from enum import Enum
from pydantic import BaseModel, Field

class Role(str, Enum):
    GUEST = "guest"
    CUSTOMER = "customer"
    ADMIN = "admin"

class Principal(BaseModel):
    """
    Immutable identity context attached by Server-side Auth Guard.
    LLM and graph nodes CANNOT overwrite this context (Principle 3).
    """
    user_id: str = Field(..., description="Unique subject ID of caller")
    role: str = Field(default=Role.GUEST.value, description="Role for RBAC evaluation")
    tenant_id: str = Field(default="default", description="Tenant isolation boundary")
