import asyncio
import json
import httpx
from agent_platform.llm.base import LLMPort, LLMResponse, ToolCall
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.llm.providers.mock import MockLLMClient
from agent_platform.llm.providers.openai_compat import OpenAICompatibleLLM
from agent_platform.llm.resilient import ResilientLLMClient

def test_llm_port_contract_conformance():
    """Verifies that all providers satisfy LLMPort protocol."""
    scripted = ScriptedLLM()
    mock_client = MockLLMClient()
    openai_compat = OpenAICompatibleLLM(base_url="http://mock-llm.internal")
    resilient = ResilientLLMClient(primary_client=mock_client)

    assert isinstance(scripted, LLMPort)
    assert isinstance(mock_client, LLMPort)
    assert isinstance(openai_compat, LLMPort)
    assert isinstance(resilient, LLMPort)

def test_scripted_llm_behavior():
    """Tests multi-turn behavior using ScriptedLLM without external calls."""
    async def _run():
        llm = ScriptedLLM()
        llm.queue_tool_call(
            tool_name="lookup_order",
            arguments={"order_id": "ORD-123456"},
            call_id="call_abc",
        )
        llm.queue_answer("Đơn hàng ORD-123456 đang được vận chuyển.")

        # Step 1: expect tool call
        resp1 = await llm.complete([{"role": "user", "content": "Kiểm tra đơn hàng"}])
        assert len(resp1.tool_calls) == 1
        assert resp1.tool_calls[0].name == "lookup_order"
        assert resp1.tool_calls[0].arguments == {"order_id": "ORD-123456"}
        assert resp1.usage.prompt_tokens > 0

        # Step 2: expect answer
        resp2 = await llm.complete([
            {"role": "user", "content": "Kiểm tra đơn hàng"},
            {"role": "tool", "content": "Delivered", "name": "lookup_order"},
        ])
        assert resp2.content == "Đơn hàng ORD-123456 đang được vận chuyển."
        assert len(resp2.tool_calls) == 0

    asyncio.run(_run())

def test_openai_compatible_mocked_network():
    """Tests OpenAICompatibleLLM parsing native tool calls using httpx MockTransport."""
    async def _run():
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.url.path == "/v1/chat/completions"
            req_data = json.loads(request.content.decode("utf-8"))
            assert "messages" in req_data
            assert req_data["model"] == "test-model"

            mock_payload = {
                "id": "chatcmpl-123",
                "model": "test-model",
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [{
                            "id": "call_xyz",
                            "type": "function",
                            "function": {
                                "name": "search_knowledge",
                                "arguments": "{\"query\": \"chính sách hoàn tiền\"}",
                            }
                        }]
                    }
                }],
                "usage": {
                    "prompt_tokens": 120,
                    "completion_tokens": 30,
                    "total_tokens": 150,
                }
            }
            return httpx.Response(200, json=mock_payload)

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as client:
            llm = OpenAICompatibleLLM(
                base_url="http://mock.internal/v1",
                api_key="sk-test",
                model_name="test-model",
                http_client=client,
            )
            resp = await llm.complete(
                [{"role": "user", "content": "Chính sách thế nào?"}],
                tools=[{"name": "search_knowledge", "description": "Tìm kiếm tri thức", "parameters": {}}],
            )

            assert len(resp.tool_calls) == 1
            assert resp.tool_calls[0].name == "search_knowledge"
            assert resp.tool_calls[0].arguments == {"query": "chính sách hoàn tiền"}
            assert resp.usage.total_tokens == 150
            assert resp.provider == "openai_compat"

    asyncio.run(_run())

def test_resilient_llm_fallback_on_failure():
    """Tests ResilientLLMClient tripping to fallback client when primary fails."""
    async def _run():
        class FailingLLM(LLMPort):
            async def complete(self, messages, *, tools=None, temperature=0.0, max_tokens=2048):
                raise httpx.ConnectError("Primary server unreachable")
            async def stream(self, messages, *, tools=None, temperature=0.0):
                raise httpx.ConnectError("Primary server unreachable")
                yield  # pragma: no cover

        primary = FailingLLM()
        fallback = ScriptedLLM()
        fallback.queue_answer("Fallback answering successfully")

        resilient = ResilientLLMClient(
            primary_client=primary,
            fallback_client=fallback,
            max_retries=1,
        )

        resp = await resilient.complete([{"role": "user", "content": "Hello"}])
        assert resp.content == "Fallback answering successfully"

    asyncio.run(_run())
