from decimal import Decimal
from pathlib import Path
from typing import Dict, Any, List, Optional, Literal
import yaml
from pydantic import BaseModel, Field

class PolicyDecision(BaseModel):
    action: Literal["allow", "require_approval", "deny"]
    approver_role: Optional[str] = None
    timeout_hours: int = 24
    reason: Optional[str] = None

class PolicyEngine:
    """
    Evaluates enterprise governance policies (RBAC and decimal-safe approval rules).
    Fixes A14: Strict Decimal currency comparisons with zero float rounding errors.
    """

    def __init__(self, policy_data: Optional[Dict[str, Any]] = None) -> None:
        self.data: Dict[str, Any] = policy_data or {}
        self.rbac: Dict[str, Any] = self.data.get("rbac", {})
        self.approval_rules: Dict[str, Any] = self.data.get("approval_rules", {})

    @classmethod
    def load_from_file(cls, file_path: str | Path) -> "PolicyEngine":
        path = Path(file_path).resolve()
        if not path.is_file():
            return cls({})
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            return cls(data)

    def check_rbac(self, role: str, tool_name: str) -> bool:
        """Returns True if role is permitted to call the specified tool."""
        role_spec = self.rbac.get(role)
        if not role_spec:
            return False

        allowed = role_spec.get("allowed_tools", [])
        if allowed == "*" or (isinstance(allowed, list) and "*" in allowed):
            return True
        return tool_name in allowed

    def evaluate_approval_rule(self, rule_name: str, args: Dict[str, Any]) -> PolicyDecision:
        """Evaluates value tier thresholds using Decimal arithmetic."""
        rule = self.approval_rules.get(rule_name)
        if not rule:
            # Default allow if no rule declared
            return PolicyDecision(action="allow")

        field_name = rule.get("field", "amount")
        raw_val = args.get(field_name)
        if raw_val is None:
            return PolicyDecision(action="deny", reason=f"Missing evaluation field: {field_name}")

        try:
            val_decimal = Decimal(str(raw_val))
        except Exception:
            return PolicyDecision(action="deny", reason=f"Cannot parse {raw_val} into Decimal")

        tiers = rule.get("tiers", [])
        for tier in tiers:
            max_limit = tier.get("max")
            if max_limit is not None:
                tier_decimal = Decimal(str(max_limit))
                if val_decimal <= tier_decimal:
                    return PolicyDecision(
                        action=tier.get("action", "allow"),
                        approver_role=tier.get("approver_role"),
                        timeout_hours=tier.get("timeout_hours", 24),
                        reason=tier.get("reason"),
                    )
            else:
                # Catch-all tier
                return PolicyDecision(
                    action=tier.get("action", "deny"),
                    approver_role=tier.get("approver_role"),
                    timeout_hours=tier.get("timeout_hours", 24),
                    reason=tier.get("reason", "Threshold exceeded maximum allowed limit"),
                )

        return PolicyDecision(action="deny", reason="No policy tier matched")
