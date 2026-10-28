import asyncio
import logging
from pathlib import Path

import httpx
import pytest
from pydantic import BaseModel

from agent_platform.agents.workflow.builder import build_agent_graph
from agent_platform.agents.workflow.runner import AgentRunner
from agent_platform.domain.pack import DomainPack
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.guards.pii import PIIMasker, PIIRedactionError
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.spec import tool, ToolContext
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.rag.retrieval.reranker import CohereRerankerClient


def test_numeric_fields_and_keys_are_redacted_without_masking_prices():
    original = {"cccd": 123456789012, "contact_phone": 912345678, "price_vnd": 123456789012,
                "alice@example.test": {"quantity": 5}}
    safe = PIIMasker.mask(original)
    assert safe["cccd"] == "[REDACTED_CCCD]"
    assert safe["contact_phone"] == "[REDACTED_PHONE]"
    assert safe["price_vnd"] == original["price_vnd"]
    assert "alice@example.test" not in safe
    assert safe["[REDACTED_EMAIL]"] == {"quantity": 5}
    assert original["cccd"] == 123456789012


def test_email_with_phone_as_local_part_is_wholly_masked():
    assert PIIMasker.mask("0912345678@example.test") == "[REDACTED_EMAIL]"
    assert PIIMasker.mask("https://example.test/?key=fake_secret&x=1") == "https://example.test/?key=[REDACTED_SECRET]&x=1"


def test_redacted_key_collision_fails_closed():
    with pytest.raises(PIIRedactionError):
        PIIMasker.mask({"alice@example.test": "one", "bob@example.test": "two"})
    assert len(PIIMasker.mask({"alice@example.test": "one", "bob@example.test": "two"}, fail_closed=False)) == 2


@pytest.mark.parametrize("asynchronous", [False, True])
def test_cohere_error_logs_never_include_exception(asynchronous, monkeypatch, caplog):
    sensitive = "0912345678 api_key=FAKE_PRIVATE_VALUE"
    class Client:
        def __init__(self, **kwargs): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        def post(self, *args, **kwargs):
            if asynchronous:
                async def failed(): raise RuntimeError(sensitive)
                return failed()
            raise RuntimeError(sensitive)
    monkeypatch.setattr(httpx, "AsyncClient" if asynchronous else "Client", Client)
    reranker = CohereRerankerClient(api_key="test")
    with caplog.at_level(logging.WARNING):
        if asynchronous:
            asyncio.run(reranker.arerank("query", [{"content": "sample"}]))
        else:
            reranker.rerank("query", [{"content": "sample"}])
    assert sensitive not in caplog.text
    assert "0912345678" not in caplog.text
    assert "FAKE_PRIVATE_VALUE" not in caplog.text


def test_chat_to_llm_to_tool_rejects_placeholder_before_backend():
    calls = []
    class TicketInput(BaseModel):
        contact_phone: str
    @tool(name="ticket", description="test", input_model=TicketInput, side_effect=True, allowed_roles=["customer"])
    async def ticket(args: TicketInput, ctx: ToolContext):
        calls.append(args.contact_phone)
        return {"status": "success"}

    async def run():
        pack_dir = Path("domains/retail_store") if Path("domains/retail_store").is_dir() else Path("agent-system/domains/retail_store")
        pack = DomainPack.load_from_dir(pack_dir)
        registry = ToolRegistry()
        registry.register(ticket)
        executor = ToolExecutor(registry, PolicyEngine({}))
        llm = ScriptedLLM()
        # Model only sees the masked input and proposes a placeholder argument.
        llm.queue_tool_call("ticket", {"contact_phone": "[REDACTED_PHONE]"})
        state = await AgentRunner(build_agent_graph(pack, llm, registry, executor)).execute(
            "Liên hệ 0912345678", Principal(user_id="alice", role="customer"))
        assert "0912345678" not in str(llm.history_calls)
        assert "[REDACTED_PHONE]" in str(llm.history_calls)
        assert calls == []
        assert state["status"] == "abstained"
        assert "kênh nhập liệu an toàn" in state["final_answer"]
        assert state["tool_events"][0].is_error
        assert executor.idempotency._store == {}
    asyncio.run(run())
