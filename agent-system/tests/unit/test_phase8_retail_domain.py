"""Phase 8 Extension: Comprehensive Unit & Governance Tests for retail_store Domain Pack."""

import asyncio
from decimal import Decimal
from pathlib import Path
import pytest

from agent_platform.domain.registry import DomainRegistry
from agent_platform.domain.pack import DomainPack
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness import AgentHarness
from agent_platform.config.settings import PlatformSettings, LLMSettings


def test_load_retail_store_domain():
    registry = DomainRegistry("domains")
    pack = registry.get("retail_store")
    assert pack is not None
    assert pack.name == "retail_store"
    assert "lookup_laptop_catalog" in pack.tools.enabled
    assert "query_order_status" in pack.tools.enabled
    assert "request_return_or_refund" in pack.tools.enabled
    assert "search_knowledge" in pack.tools.enabled
    assert "guest" in pack.roles
    assert "customer" in pack.roles
    assert "admin" in pack.roles


def test_retail_laptop_catalog_tool():
    async def _run():
        registry = DomainRegistry("domains")
        pack = registry.get("retail_store")
        assert pack is not None

        tool_reg = ToolRegistry()
        tool_reg.load_from_module_file(pack.pack_dir / pack.tools.module)

        tool = tool_reg.get("lookup_laptop_catalog")
        assert tool is not None

        policy = PolicyEngine.load_from_file(pack.pack_dir / pack.policies)
        executor = ToolExecutor(tool_reg, policy)

        # 1. Search laptop under 20M with min 16GB RAM
        principal = Principal(user_id="guest_user", role="guest")
        res = await executor.execute(
            tool_name="lookup_laptop_catalog",
            arguments={"max_price": "20000000", "min_ram_gb": 16},
            principal=principal,
            call_id="call_lap_01",
        )
        assert res.is_error is False
        assert "Asus Vivobook 15" in res.output
        assert "Dell Inspiron 14" in res.output
        assert "Lenovo ThinkBook 14" in res.output
        assert "17990000" in res.output

        # 2. Filter by brand DELL
        res_dell = await executor.execute(
            tool_name="lookup_laptop_catalog",
            arguments={"brand": "DELL"},
            principal=principal,
            call_id="call_lap_dell",
        )
        assert res_dell.is_error is False
        assert "Dell Inspiron 14" in res_dell.output
        assert "Asus" not in res_dell.output

    asyncio.run(_run())


def test_retail_refund_governance_tiers():
    async def _run():
        registry = DomainRegistry("domains")
        pack = registry.get("retail_store")
        assert pack is not None

        tool_reg = ToolRegistry()
        tool_reg.load_from_module_file(pack.pack_dir / pack.tools.module)
        policy = PolicyEngine.load_from_file(pack.pack_dir / pack.policies)
        executor = ToolExecutor(tool_reg, policy)

        # 1. Guest role is forbidden from requesting refunds
        guest = Principal(user_id="g1", role="guest")
        res_guest = await executor.execute(
            tool_name="request_return_or_refund",
            arguments={
                "order_id": "ORD-100201",
                "amount": "100000",
                "reason": "Giao chậm",
                "customer_name": "Khách Vãng Lai",
            },
            principal=guest,
            call_id="call_g_refund",
        )
        assert res_guest.is_error is True
        assert res_guest.error_code == "forbidden"

        # 2. Customer <= 200,000 VNĐ -> Auto-allowed
        customer = Principal(user_id="c1", role="customer")
        res_auto = await executor.execute(
            tool_name="request_return_or_refund",
            arguments={
                "order_id": "ORD-100201",
                "amount": "150000",
                "reason": "Bù cước vận chuyển",
                "customer_name": "Nguyễn Văn A",
            },
            principal=customer,
            call_id="call_c_auto",
        )
        assert res_auto.is_error is False
        assert res_auto.requires_approval is False
        assert "processed" in res_auto.output

        # 3. Customer > 200,000 VNĐ and <= 2,000,000 VNĐ -> Requires HITL Admin approval
        res_hitl = await executor.execute(
            tool_name="request_return_or_refund",
            arguments={
                "order_id": "ORD-100201",
                "amount": "500000",
                "reason": "Phụ kiện lỗi",
                "customer_name": "Nguyễn Văn B",
            },
            principal=customer,
            call_id="call_c_hitl",
        )
        assert res_hitl.requires_approval is True
        assert res_hitl.approval_metadata["approver_role"] == "admin"

        # 4. Customer > 2,000,000 VNĐ -> Denied by policy
        res_deny = await executor.execute(
            tool_name="request_return_or_refund",
            arguments={
                "order_id": "ORD-100201",
                "amount": "5000000",
                "reason": "Đổi ý không mua",
                "customer_name": "Nguyễn Văn C",
            },
            principal=customer,
            call_id="call_c_deny",
        )
        assert res_deny.is_error is True
        assert res_deny.error_code == "policy_denied"

    asyncio.run(_run())


def test_retail_knowledge_retriever_hybrid():
    async def _run():
        registry = DomainRegistry("domains")
        pack = registry.get("retail_store")
        assert pack is not None

        tool_reg = ToolRegistry()
        tool_reg.load_from_module_file(pack.pack_dir / pack.tools.module)
        search_tool = tool_reg.get("search_knowledge")
        assert search_tool is not None

        policy = PolicyEngine.load_from_file(pack.pack_dir / pack.policies)
        executor = ToolExecutor(tool_reg, policy)

        principal = Principal(user_id="cust_test", role="customer")
        res = await executor.execute(
            tool_name="search_knowledge",
            arguments={"query": "chính sách đổi trả 30 ngày bảo hành"},
            principal=principal,
            call_id="call_retrieval_01",
        )
        assert res.is_error is False
        assert "30 ngày" in res.output or "24 tháng" in res.output

    asyncio.run(_run())
