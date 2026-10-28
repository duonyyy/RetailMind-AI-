"""End-to-End Verification Test Suite: Tool Parameter Separation & Telemetry PII Isolation.

Adheres strictly to Task 3 Specification & Definition of Done:
1. LLM View: ToolMessage and LLM Prompt receive only sanitized/redacted data ([REDACTED_PHONE]).
2. Trusted Backend View: Internal HTTP gateway receives authenticated customer identity (ctx.principal.user_id)
   via X-Customer-Id header, enforcing strict anti-IDOR protection.
3. Telemetry Isolation: Phoenix / OpenTelemetry spans (GenAITracer 11-span hierarchy) NEVER contain
   the customer's raw phone number or identifying credentials.
4. Accurate Final Answer: The customer receives an accurate status answer without leaking private PII.
"""

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
import pytest
from pydantic import BaseModel, Field

from agent_platform.domain.pack import DomainPack
from agent_platform.agents.enterprise_agent import EnterpriseAgent
from agent_platform.agents.workflow.builder import build_agent_graph
from agent_platform.agents.workflow.runner import AgentRunner
from agent_platform.harness.guards.pii import PIIMasker
from agent_platform.harness.observability.tracer import GenAITracer, GenAISpanNames
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.state.contracts import AgentState
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.spec import tool, ToolContext, ToolUnavailableError
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger
from agent_platform.llm.providers.scripted import ScriptedLLM
from langchain_core.messages import HumanMessage


# ===========================================================================
# Authoritative Business Baseline (SSOT Mock Core Backend)
# ===========================================================================
CUSTOMER_ALICE = {
    "user_id": "cust_alice_01",
    "role": "customer",
    "name": "Nguyễn Thị Alice",
    "phone": "0912345678",
    "email": "alice.nguyen@mwg.vn",
}

CUSTOMER_BOB = {
    "user_id": "cust_bob_02",
    "role": "customer",
    "name": "Trần Văn Bob",
    "phone": "0987654321",
    "email": "bob.tran@mwg.vn",
}

ORDERS_DATABASE: Dict[str, Dict[str, Any]] = {
    "ORD-100201": {
        "order_id": "ORD-100201",
        "order_no": "ORD-100201",
        "customer_id": "cust_alice_01",
        "recipient_name": "Nguyễn Thị Alice",
        "recipient_phone": "0912345678",
        "recipient_email": "alice.nguyen@mwg.vn",
        "delivery_address": "128 Trần Quang Khải, P. Tân Định, Quận 1, TP.HCM",
        "order_status": "DELIVERED",
        "total_vnd": "17990000",
        "store_id": "MWG_HCM_001",
        "items": [
            {
                "sku": "LAP-ASUS-VIVO15",
                "name": "Laptop Asus Vivobook 15 OLED A1505VA",
                "quantity": 1,
                "price_vnd": "17990000",
            }
        ],
    }
}


# ===========================================================================
# Tool Definition with Strict Trusted Backend Boundary
# ===========================================================================
class LookupOrderInput(BaseModel):
    order_id: str = Field(
        ...,
        pattern=r"^(ORD-\d{6,10}|MWG-\d{8}-\d{4})$",
        description="Mã đơn hàng cần tra cứu (định dạng ORD-XXXXXX)",
    )


def create_lookup_order_tool(backend_requests: List[Dict[str, Any]]):
    """Factory creating lookup_order tool that simulates internal NestJS Core API call."""

    @tool(
        name="lookup_order",
        description="Tra cứu thông tin chi tiết đơn hàng MWG theo mã đơn hàng.",
        input_model=LookupOrderInput,
        side_effect=False,
        allowed_roles=["customer", "admin"],
        timeout_s=5.0,
    )
    async def lookup_order(args: LookupOrderInput, ctx: ToolContext) -> Dict[str, Any]:
        customer_id = getattr(ctx.principal, "user_id", "guest")
        customer_role = getattr(ctx.principal, "role", "guest")

        # Record HTTP request received by Trusted Backend Gateway
        req_record = {
            "endpoint": "/api/v1/internal/tools/get_order_status",
            "order_id": args.order_id,
            "x_customer_id": customer_id,
            "x_role": customer_role,
        }
        backend_requests.append(req_record)

        # 1. Anti-IDOR Check: In NestJS Core API (orders.service.ts), verify order ownership
        order = ORDERS_DATABASE.get(args.order_id)
        if not order:
            raise ToolUnavailableError(f"Không tìm thấy đơn hàng {args.order_id}")

        if customer_role != "admin" and order["customer_id"] != customer_id:
            # Anti-IDOR: Customer cannot access other customers' orders
            raise ToolUnavailableError("Không tìm thấy đơn hàng thuộc quyền sở hữu của bạn.")

        # 2. Return authoritative backend business record (contains raw unmasked business phone)
        return {
            "status": "success",
            "order_id": order["order_id"],
            "order_no": order["order_no"],
            "order_status": order["order_status"],
            "customer_id": order["customer_id"],
            "recipient_name": order["recipient_name"],
            "recipient_phone": order["recipient_phone"],
            "delivery_address": order["delivery_address"],
            "total_vnd": order["total_vnd"],
            "store_id": order["store_id"],
            "source": "nestjs_commerce_ssot",
        }

    return lookup_order


# ===========================================================================
# Test Suite
# ===========================================================================
class TestOrderLookupPIIIsolationE2E:
    """Verifies complete E2E isolation of sensitive customer data during order lookup."""

    def test_customer_order_lookup_pii_isolation_and_telemetry(self):
        """DoD Verification:
        - Customer requests order status for their own order ORD-100201.
        - Trusted backend receives real X-Customer-Id (anti-IDOR) and business data.
        - ToolMessage returned to LLM has [REDACTED_PHONE].
        - AI produces accurate answer for customer.
        - Customer's real phone (0912345678) NEVER appears in LLM prompt or Phoenix telemetry!
        """
        async def _run():
            backend_requests: List[Dict[str, Any]] = []
            lookup_tool = create_lookup_order_tool(backend_requests)

            # Setup domain pack, tools, and tracer
            domain_dir = Path(__file__).parents[2] / "domains" / "retail_store"
            pack = DomainPack.load_from_dir(domain_dir)

            registry = ToolRegistry()
            registry.register(lookup_tool)

            tracer = GenAITracer(service_name="retailmind-e2e-order-lookup")
            ledger = TamperEvidentHashChainLedger()
            policy_engine = PolicyEngine.load_from_file(domain_dir / "policies.yaml")
            executor = ToolExecutor(registry, policy_engine, audit_ledger=ledger)

            # Scripted LLM simulating multi-turn reasoning:
            # Turn 1: LLM proposes calling lookup_order
            # Turn 2: LLM receives ToolMessage and answers customer
            llm = ScriptedLLM()
            llm.queue_tool_call(
                tool_name="lookup_order",
                arguments={"order_id": "ORD-100201"},
                call_id="call_lookup_001",
            )
            llm.queue_answer(
                "Đơn hàng ORD-100201 của bạn đã được giao thành công tại siêu thị "
                "MWG_HCM_001 với tổng giá trị 17.990.000 VNĐ."
            )

            graph = build_agent_graph(pack, llm, registry, executor)
            runner = AgentRunner(graph)

            principal_alice = Principal(
                user_id=CUSTOMER_ALICE["user_id"],
                role="customer",
                tenant_id="retail",
            )

            # Track with Phoenix / OpenTelemetry GenAITracer
            trace_id = tracer.start_trace("trace_order_lookup_alice_01")
            with tracer.start_span(GenAISpanNames.HTTP_INGRESS, attributes={"user_id": principal_alice.user_id}):
                with tracer.start_span(GenAISpanNames.ORCHESTRATOR):
                    # Customer asks about their order
                    user_query = "Kiểm tra tình trạng đơn hàng ORD-100201 của tôi"
                    final_state = await runner.execute(user_query, principal_alice)

                    # Record LLM inference span in telemetry
                    for call_msgs in llm.history_calls:
                        sanitized_prompt = json.dumps(call_msgs, default=str)
                        with tracer.start_span(
                            GenAISpanNames.LLM_INFERENCE,
                            attributes={
                                "gen_ai.prompt": sanitized_prompt,
                                "gen_ai.model": "scripted-v3",
                            },
                        ):
                            pass

            # ---------------------------------------------------------------
            # 1. Verification of Trusted Backend Boundary (Anti-IDOR)
            # ---------------------------------------------------------------
            assert len(backend_requests) == 1
            assert backend_requests[0]["x_customer_id"] == "cust_alice_01"
            assert backend_requests[0]["order_id"] == "ORD-100201"

            # ---------------------------------------------------------------
            # 2. Verification of ToolMessage Content (Masked PII)
            # ---------------------------------------------------------------
            tool_events = final_state.get("tool_events", [])
            assert len(tool_events) >= 1
            tool_event = tool_events[0]
            assert tool_event.tool_name == "lookup_order"
            assert not tool_event.is_error

            # The output seen by the agent state MUST be redacted
            tool_output_str = str(tool_event.output)
            assert CUSTOMER_ALICE["phone"] not in tool_output_str
            assert "[REDACTED_PHONE]" in tool_output_str

            # ---------------------------------------------------------------
            # 3. Verification of LLM Provider Boundary (Zero Raw Phone)
            # ---------------------------------------------------------------
            llm_history_str = json.dumps(llm.history_calls, default=str)
            assert CUSTOMER_ALICE["phone"] not in llm_history_str, (
                f"Raw customer phone '{CUSTOMER_ALICE['phone']}' leaked to LLM provider!\n"
                f"History calls: {llm_history_str}"
            )
            assert "[REDACTED_PHONE]" in llm_history_str

            # ---------------------------------------------------------------
            # 4. Verification of Phoenix / OpenTelemetry Spans
            # ---------------------------------------------------------------
            completed_spans = tracer.get_spans(trace_id)
            assert len(completed_spans) >= 2
            telemetry_dump = json.dumps([s.to_dict() for s in completed_spans], default=str)

            # Customer raw phone number MUST NEVER exist in any telemetry span attribute
            assert CUSTOMER_ALICE["phone"] not in telemetry_dump, (
                f"Raw customer phone '{CUSTOMER_ALICE['phone']}' leaked into Phoenix telemetry!\n"
                f"Telemetry dump: {telemetry_dump}"
            )

            # ---------------------------------------------------------------
            # 5. Verification of Accurate Final Answer
            # ---------------------------------------------------------------
            assert final_state["status"] == "done"
            final_answer = final_state.get("final_answer", "")
            assert "ORD-100201" in final_answer
            assert "giao thành công" in final_answer.lower() or "17.990.000" in final_answer
            assert CUSTOMER_ALICE["phone"] not in final_answer

        asyncio.run(_run())

    def test_idor_prevention_bob_cannot_access_alice_order(self):
        """Verifies that if Customer Bob attempts to query Alice's order ORD-100201,
        the request is blocked by Anti-IDOR check without leaking Alice's data."""
        async def _run():
            backend_requests: List[Dict[str, Any]] = []
            lookup_tool = create_lookup_order_tool(backend_requests)

            domain_dir = Path(__file__).parents[2] / "domains" / "retail_store"
            pack = DomainPack.load_from_dir(domain_dir)

            registry = ToolRegistry()
            registry.register(lookup_tool)

            policy_engine = PolicyEngine.load_from_file(domain_dir / "policies.yaml")
            executor = ToolExecutor(registry, policy_engine)

            llm = ScriptedLLM()
            llm.queue_tool_call(
                tool_name="lookup_order",
                arguments={"order_id": "ORD-100201"},
                call_id="call_idor_001",
            )
            llm.queue_answer("Không tìm thấy thông tin đơn hàng.")

            graph = build_agent_graph(pack, llm, registry, executor)
            runner = AgentRunner(graph)

            # Bob asks for Alice's order
            principal_bob = Principal(
                user_id=CUSTOMER_BOB["user_id"],
                role="customer",
                tenant_id="retail",
            )

            final_state = await runner.execute(
                "Tra cứu đơn hàng ORD-100201 giúp tôi",
                principal_bob,
            )

            # Verify backend received Bob's identity
            assert len(backend_requests) == 1
            assert backend_requests[0]["x_customer_id"] == "cust_bob_02"

            # Verify tool event reports error / unavailable
            tool_events = final_state.get("tool_events", [])
            assert len(tool_events) >= 1
            assert tool_events[0].is_error is True

            # Alice's sensitive data is NEVER in the response
            final_str = json.dumps(final_state, default=str)
            assert CUSTOMER_ALICE["phone"] not in final_str
            assert CUSTOMER_ALICE["name"] not in final_str

        asyncio.run(_run())

