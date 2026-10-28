import asyncio
from decimal import Decimal
from pydantic import BaseModel, Field
import pytest
from agent_platform.harness.state.principal import Principal, Role
from agent_platform.harness.tools.spec import tool, ToolContext
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger

class RefundInput(BaseModel):
    order_id: str = Field(..., pattern=r"^ORD-\d{6}$")
    amount: Decimal = Field(..., gt=0)
    reason: str = Field(..., min_length=3)

execution_counter = 0

@tool(
    name="request_refund",
    description="Khởi tạo yêu cầu hoàn tiền",
    input_model=RefundInput,
    side_effect=True,
    allowed_roles=["customer", "admin"],
    approval_rule="refund_threshold",
)
async def sample_refund_tool(args: RefundInput, ctx: ToolContext) -> dict:
    global execution_counter
    execution_counter += 1
    return {
        "status": "success",
        "order_id": args.order_id,
        "amount": str(args.amount),
        "execution_count": execution_counter,
    }

def get_test_policy_engine() -> PolicyEngine:
    policy_data = {
        "rbac": {
            "guest": {"allowed_tools": ["search_knowledge"]},
            "customer": {"allowed_tools": ["search_knowledge", "request_refund"]},
            "admin": {"allowed_tools": "*"},
        },
        "approval_rules": {
            "refund_threshold": {
                "field": "amount",
                "tiers": [
                    {"max": "200000", "action": "allow"},
                    {"max": "2000000", "action": "require_approval", "approver_role": "admin"},
                    {"action": "deny", "reason": "Vượt hạn mức tối đa"},
                ]
            }
        }
    }
    return PolicyEngine(policy_data)

def test_tool_registration_and_schemas():
    registry = ToolRegistry()
    registry.register(sample_refund_tool)

    assert registry.get("request_refund") is not None
    schemas = registry.get_schemas(allowed_for_role="customer")
    assert len(schemas) == 1
    assert schemas[0]["function"]["name"] == "request_refund"

def test_validation_error_on_invalid_input():
    async def _run():
        registry = ToolRegistry()
        registry.register(sample_refund_tool)
        executor = ToolExecutor(registry, get_test_policy_engine())

        principal = Principal(user_id="user_1", role="customer")
        res = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "INVALID", "amount": -100, "reason": "x"},
            principal=principal,
        )
        assert res.is_error is True
        assert res.error_code == "validation_error"

    asyncio.run(_run())

def test_rbac_rejection_for_guest():
    async def _run():
        registry = ToolRegistry()
        registry.register(sample_refund_tool)
        executor = ToolExecutor(registry, get_test_policy_engine())

        principal = Principal(user_id="guest_1", role="guest")
        res = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "100000", "reason": "Lỗi"},
            principal=principal,
        )
        assert res.is_error is True
        assert res.error_code == "forbidden"

    asyncio.run(_run())

def test_policy_tiers_decimal_precision():
    async def _run():
        global execution_counter
        execution_counter = 0
        registry = ToolRegistry()
        registry.register(sample_refund_tool)
        executor = ToolExecutor(registry, get_test_policy_engine())
        principal = Principal(user_id="cust_1", role="customer")

        # Tier 1: <= 200,000 -> Auto Allow
        res1 = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "150000", "reason": "Đổi ý"},
            principal=principal,
            call_id="call_1",
        )
        assert res1.is_error is False
        assert res1.requires_approval is False
        assert "success" in res1.output

        # Tier 2: 200,001 to 2,000,000 -> Require Admin Approval
        res2 = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "500000", "reason": "Lỗi màn hình"},
            principal=principal,
            call_id="call_2",
        )
        assert res2.requires_approval is True
        assert res2.approval_metadata["approver_role"] == "admin"

        # Tier 3: > 2,000,000 -> Deny
        res3 = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "5000000", "reason": "Hàng hư"},
            principal=principal,
            call_id="call_3",
        )
        assert res3.is_error is True
        assert res3.error_code == "policy_denied"

    asyncio.run(_run())

def test_idempotency_replay_prevents_duplicate_execution():
    async def _run():
        global execution_counter
        execution_counter = 0
        registry = ToolRegistry()
        registry.register(sample_refund_tool)
        executor = ToolExecutor(registry, get_test_policy_engine())
        principal = Principal(user_id="cust_1", role="customer")

        # First execution
        res1 = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "100000", "reason": "Lỗi nút"},
            principal=principal,
            thread_id="th_100",
            call_id="call_same_id",
        )
        assert execution_counter == 1

        # Second execution with identical thread_id + call_id (Replay)
        res2 = await executor.execute(
            tool_name="request_refund",
            arguments={"order_id": "ORD-123456", "amount": "100000", "reason": "Lỗi nút"},
            principal=principal,
            thread_id="th_100",
            call_id="call_same_id",
        )
        assert execution_counter == 1  # Function was NOT called a second time
        assert res1.output == res2.output

    asyncio.run(_run())

def test_tamper_evident_audit_ledger_integrity():
    ledger = TamperEvidentHashChainLedger()
    ledger.record_event(
        event_id="e1",
        thread_id="t1",
        user_id="u1",
        role="customer",
        tenant_id="mwg",
        tool_name="refund",
        input_masked={"amount": "100"},
        decision="executed",
    )
    ledger.record_event(
        event_id="e2",
        thread_id="t1",
        user_id="u1",
        role="customer",
        tenant_id="mwg",
        tool_name="refund",
        input_masked={"amount": "200"},
        decision="executed",
    )

    # Initial chain is intact
    assert ledger.verify_integrity() is True

    # Tamper with first event
    ledger.get_events()[0].decision = "tampered"
    assert ledger.verify_integrity() is False
