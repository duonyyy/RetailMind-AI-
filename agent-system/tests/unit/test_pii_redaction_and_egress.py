"""Comprehensive Verification Test Suite for PII Redaction and Provider Boundary Control.

Verifies:
1. PIIMasker: Exact placeholders, regex coverage, negatives, nested immutability, idempotence, depth limits.
2. Provider Payload Capture: OpenAI-compatible, Gemini, Resilient fallback, Embeddings, Reranker, LLM Judge.
3. Fail-Closed: Masking error aborts provider egress without sending raw payloads.
4. Tool Outputs, Audit Ledger, ToolEvents, Validation Errors, and Logs.
5. Trusted Backend: Verification that trusted backend receives authoritative business data while LLM/audit get redacted representations.
"""

import asyncio
from decimal import Decimal
import json
import logging
from typing import Any, Dict, List, Optional
import httpx
import pytest
from pydantic import BaseModel, Field

from agent_platform.harness.guards.pii import PIIMasker, PIIRedactionError
from agent_platform.llm.base import LLMPort, LLMResponse, ToolCall, Usage
from agent_platform.llm.providers.openai_compat import OpenAICompatibleLLM
from agent_platform.llm.providers.gemini import GeminiLLM
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.llm.resilient import ResilientLLMClient
from agent_platform.rag.embedding.client import OpenAICompatibleEmbeddingClient, GeminiEmbeddingClient
from agent_platform.rag.retrieval.reranker import CohereRerankerClient, BGERerankerClient
from evals.judges.llm_judge import TrueLLMJudge
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.state.contracts import AgentState
from agent_platform.harness.tools.spec import tool, ToolContext
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.governance.audit_ledger import TamperEvidentHashChainLedger
from agent_platform.agents.workflow.nodes.tool_exec import create_tool_exec_node


# ===========================================================================
# 1. Redactor Unit Tests
# ===========================================================================
class TestPIIMaskerUnit:
    """Tests exact regex matching, placeholders, immutability, and edge cases."""

    def test_exact_placeholders(self):
        assert PIIMasker.mask_text("CCCD: 001099012345") == "CCCD: [REDACTED_CCCD]"
        assert PIIMasker.mask_text("SĐT: 0912345678") == "SĐT: [REDACTED_PHONE]"
        assert PIIMasker.mask_text("Email: test@mwg.vn") == "Email: [REDACTED_EMAIL]"

    @pytest.mark.parametrize("phone", [
        "0912345678",
        "0912 345 678",
        "0912.345.678",
        "0912-345-678",
        "091-234-5678",
        "+84912345678",
        "+84 912 345 678",
        "+84-912-345-678",
        "+84.912.345.678",
        "(+84) 912 345 678",
        "(+84)912345678",
        "84912345678",
        "032 123 4567",
        "056-789-0123",
        "077.888.9999",
        "089 123 4567",
    ])
    def test_phone_number_formats(self, phone: str):
        text = f"Liên hệ tôi qua số {phone} vào giờ hành chính."
        masked = PIIMasker.mask_text(text)
        assert phone not in masked
        assert "[REDACTED_PHONE]" in masked

    @pytest.mark.parametrize("cccd", [
        "001099012345",
        "001 099 012 345",
        "001.099.012.345",
        "001-099-012-345",
        "079095000123",
    ])
    def test_cccd_formats(self, cccd: str):
        text = f"Số căn cước công dân của tôi là {cccd} cấp tại Hà Nội."
        masked = PIIMasker.mask_text(text)
        assert cccd not in masked
        assert "[REDACTED_CCCD]" in masked

    @pytest.mark.parametrize("email", [
        "customer@gmail.com",
        "LAN.NGUYEN@MWG.VN",
        "dev+test1@sub.retailmind.ai",
        "support-desk_01@thegioididong.com",
    ])
    def test_email_formats(self, email: str):
        text = f"Gửi xác nhận đơn hàng về email {email} ngay nhé."
        masked = PIIMasker.mask_text(text)
        assert email not in masked
        assert "[REDACTED_EMAIL]" in masked

    def test_multiple_pii_in_single_sentence(self):
        text = (
            "Khách hàng Lan, CCCD: 001099012345, số điện thoại: 0912 345 678, "
            "email: lan.nguyen+vip@mwg.vn yêu cầu cấp lại hóa đơn GTGT."
        )
        masked = PIIMasker.mask_text(text)
        assert "001099012345" not in masked
        assert "0912 345 678" not in masked
        assert "lan.nguyen+vip@mwg.vn" not in masked
        assert "[REDACTED_CCCD]" in masked
        assert "[REDACTED_PHONE]" in masked
        assert "[REDACTED_EMAIL]" in masked

    def test_negative_cases_no_false_positives(self):
        """Monetary values, product SKUs, Order IDs, and dates MUST NOT be redacted."""
        negatives = [
            ("Giá niêm yết: 17990000 VNĐ", "17990000"),
            ("Giá khuyến mãi: 18.490.000 VNĐ", "18.490.000"),
            ("Hạn mức bồi hoàn: 200.000 VNĐ", "200.000"),
            ("Mã sản phẩm LAP-ASUS-VIVO15 đang có sẵn", "LAP-ASUS-VIVO15"),
            ("Đơn hàng ORD-100201 đã được giao", "ORD-100201"),
            ("Ngày đặt hàng 2026-10-28 lúc 14:30", "2026-10-28"),
            ("Timestamp giao dịch 1730123456789 ms", "1730123456789"),
        ]
        for text, expected_clean in negatives:
            masked = PIIMasker.mask_text(text)
            assert expected_clean in masked
            assert "[REDACTED_PHONE]" not in masked
            assert "[REDACTED_CCCD]" not in masked

    def test_nested_structures_and_immutability(self):
        original = {
            "customer": {
                "name": "Nguyễn Văn A",
                "identity": "001099012345",
                "contacts": {
                    "phone": "0912345678",
                    "emails": ["a.nguyen@mwg.vn", "personal@gmail.com"],
                },
                "history": [
                    {"order_id": "ORD-100201", "note": "Gọi số 0987654321 khi giao"}
                ],
            },
            "system_meta": {
                "price": Decimal("17990000"),
                "sku": "LAP-ASUS-VIVO15",
                "active": True,
                "null_field": None,
            }
        }

        # Clone deeply to assert original was not modified in-place
        snapshot = json.dumps(original, default=str)
        redacted = PIIMasker.mask(original)

        # Assert immutability
        assert json.dumps(original, default=str) == snapshot

        # Assert redactions in nested structure
        assert redacted["customer"]["identity"] == "[REDACTED_CCCD]"
        assert redacted["customer"]["contacts"]["phone"] == "[REDACTED_PHONE]"
        assert redacted["customer"]["contacts"]["emails"] == ["[REDACTED_EMAIL]", "[REDACTED_EMAIL]"]
        assert "[REDACTED_PHONE]" in redacted["customer"]["history"][0]["note"]

        # Assert non-PII primitives preserved
        assert redacted["system_meta"]["price"] == Decimal("17990000")
        assert redacted["system_meta"]["sku"] == "LAP-ASUS-VIVO15"
        assert redacted["system_meta"]["active"] is True
        assert redacted["system_meta"]["null_field"] is None

    def test_idempotence(self):
        text = "Khách hàng CCCD 001099012345 và SĐT 0912345678"
        pass1 = PIIMasker.mask(text)
        pass2 = PIIMasker.mask(pass1)
        pass3 = PIIMasker.mask(pass2)
        assert pass1 == pass2 == pass3

    def test_secret_keys_and_bearer_redaction(self):
        data = {
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123",
            "api_key": "sk-secret1234567890abcdef",
            "x-internal-secret": "internal_super_secret_token",
            "normal_field": "Thông tin bình thường",
        }
        masked = PIIMasker.mask(data)
        assert masked["Authorization"] == "[REDACTED_SECRET]"
        assert masked["api_key"] == "[REDACTED_SECRET]"
        assert masked["x-internal-secret"] == "[REDACTED_SECRET]"
        assert masked["normal_field"] == "Thông tin bình thường"

    def test_recursion_depth_limit_fail_closed(self):
        # Create deeply nested circular dict
        deep: Dict[str, Any] = {}
        curr = deep
        for i in range(25):
            curr["child"] = {}
            curr = curr["child"]

        with pytest.raises(PIIRedactionError):
            PIIMasker.mask(deep, max_depth=10, fail_closed=True)

    def test_phone_with_zero_width_space_is_masked(self):
        """Zero-width space evasion attack on Vietnamese phone number is defeated."""
        evasive_phone = "090\u200b123\u200b4567"
        text = f"Số liên hệ của tôi là: {evasive_phone} cần hỗ trợ gấp."
        masked = PIIMasker.mask_text(text)
        assert "[REDACTED_PHONE]" in masked
        assert "\u200b" not in masked

    def test_cccd_with_bom_is_masked(self):
        """Byte Order Mark (BOM) evasion attack on CCCD 12-digit number is defeated."""
        evasive_cccd = "001\ufeff099\ufeff012\ufeff345"
        text = f"Số căn cước công dân: {evasive_cccd} tại chi nhánh."
        masked = PIIMasker.mask_text(text)
        assert "[REDACTED_CCCD]" in masked
        assert "\ufeff" not in masked

    def test_vietnamese_unicode_preserved_after_normalization(self):
        """Precomposed and decomposed Vietnamese diacritics (Đ, à, ệ) remain intact."""
        sample_text = "Đơn hàng của bạn tại Đà Nẵng đã được cập nhật thành công, có hiệu lực từ ngày hôm nay."
        masked = PIIMasker.mask_text(sample_text)
        assert "Đ" in masked
        assert "à" in masked
        assert "ệ" in masked
        assert masked == sample_text

        # Also verify decomposed Unicode gets normalized cleanly without font/character corruption
        import unicodedata
        decomposed = unicodedata.normalize("NFD", "Đơn hàng hệ thống tại Hà Nội")
        normalized_masked = PIIMasker.mask_text(decomposed)
        assert "Đ" in normalized_masked
        assert "ệ" in normalized_masked
        assert "ộ" in normalized_masked


# ===========================================================================
# 2. Provider Egress Payload Capture Tests
# ===========================================================================
class TestProviderPayloadCapture:
    """Verifies that all provider clients transmit ONLY redacted payloads across boundaries."""

    def test_openai_compat_complete_captures_redacted_payload(self):
        async def _run():
            captured_request: Dict[str, Any] = {}

            def handler(request: httpx.Request) -> httpx.Response:
                assert request.url.path == "/v1/chat/completions"
                nonlocal captured_request
                captured_request = json.loads(request.content.decode("utf-8"))
                mock_resp = {
                    "id": "chatcmpl-test",
                    "model": "gpt-4o-mini",
                    "choices": [{"message": {"role": "assistant", "content": "Dạ tôi đã tiếp nhận thông tin."}}],
                    "usage": {"prompt_tokens": 10, "completion_tokens": 10, "total_tokens": 20},
                }
                return httpx.Response(200, json=mock_resp)

            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                llm = OpenAICompatibleLLM(
                    base_url="http://mock-provider.internal/v1",
                    api_key="sk-test-key",
                    http_client=client,
                )

                messages = [
                    {"role": "system", "content": "Bối cảnh: Khách hàng CCCD 001099012345."},
                    {"role": "user", "content": "Số điện thoại của tôi là 0912345678 và email test@mwg.vn."},
                ]

                resp = await llm.complete(messages)
                assert resp.content == "Dạ tôi đã tiếp nhận thông tin."

                # Verify outbound HTTP payload captured by MockTransport
                outbound_str = json.dumps(captured_request)
                assert "001099012345" not in outbound_str
                assert "0912345678" not in outbound_str
                assert "test@mwg.vn" not in outbound_str

                assert "[REDACTED_CCCD]" in outbound_str
                assert "[REDACTED_PHONE]" in outbound_str
                assert "[REDACTED_EMAIL]" in outbound_str

        asyncio.run(_run())

    def test_openai_compat_stream_captures_redacted_payload(self):
        async def _run():
            captured_request: Dict[str, Any] = {}

            def handler(request: httpx.Request) -> httpx.Response:
                nonlocal captured_request
                captured_request = json.loads(request.content.decode("utf-8"))
                sse_content = "data: {\"choices\": [{\"delta\": {\"content\": \"Phản hồi stream\"}}]}\n\ndata: [DONE]\n\n"
                return httpx.Response(200, text=sse_content)

            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                llm = OpenAICompatibleLLM(
                    base_url="http://mock-provider.internal/v1",
                    api_key="sk-test-key",
                    http_client=client,
                )

                messages = [{"role": "user", "content": "Hủy đơn cho SĐT 0987654321 CCCD 079095000123"}]
                chunks = []
                async for chunk in llm.stream(messages):
                    if chunk.delta_content:
                        chunks.append(chunk.delta_content)

                assert "".join(chunks) == "Phản hồi stream"
                outbound_str = json.dumps(captured_request)
                assert "0987654321" not in outbound_str
                assert "079095000123" not in outbound_str
                assert "[REDACTED_PHONE]" in outbound_str
                assert "[REDACTED_CCCD]" in outbound_str

        asyncio.run(_run())

    def test_gemini_complete_captures_redacted_payload(self):
        async def _run():
            captured_request: Dict[str, Any] = {}

            def handler(request: httpx.Request) -> httpx.Response:
                nonlocal captured_request
                captured_request = json.loads(request.content.decode("utf-8"))
                mock_resp = {
                    "candidates": [{"content": {"parts": [{"text": "Gemini response text"}]}}],
                    "usageMetadata": {"promptTokenCount": 15, "candidatesTokenCount": 5, "totalTokenCount": 20},
                }
                return httpx.Response(200, json=mock_resp)

            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                gemini = GeminiLLM(
                    api_key="mock_gemini_key",
                    http_client=client,
                )

                messages = [
                    {"role": "user", "content": "Tôi là chủ thẻ CCCD 001099012345, SĐT 0912 345 678, email vip@mwg.vn"}
                ]

                resp = await gemini.complete(messages)
                assert resp.content == "Gemini response text"

                outbound_str = json.dumps(captured_request)
                assert "001099012345" not in outbound_str
                assert "0912 345 678" not in outbound_str
                assert "vip@mwg.vn" not in outbound_str
                assert "[REDACTED_CCCD]" in outbound_str
                assert "[REDACTED_PHONE]" in outbound_str
                assert "[REDACTED_EMAIL]" in outbound_str

        asyncio.run(_run())

    def test_gemini_stream_captures_redacted_payload(self):
        async def _run():
            captured_request: Dict[str, Any] = {}

            def handler(request: httpx.Request) -> httpx.Response:
                nonlocal captured_request
                captured_request = json.loads(request.content.decode("utf-8"))
                sse_body = "data: {\"candidates\": [{\"content\": {\"parts\": [{\"text\": \"Gemini stream chunk\"}]}}]}\n\n"
                return httpx.Response(200, text=sse_body)

            transport = httpx.MockTransport(handler)
            async with httpx.AsyncClient(transport=transport) as client:
                gemini = GeminiLLM(api_key="mock_key", http_client=client)
                messages = [{"role": "user", "content": "Khách hàng SĐT +84912345678"}]
                chunks = []
                async for chunk in gemini.stream(messages):
                    if chunk.delta_content:
                        chunks.append(chunk.delta_content)

                assert "".join(chunks) == "Gemini stream chunk"
                outbound_str = json.dumps(captured_request)
                assert "+84912345678" not in outbound_str
                assert "[REDACTED_PHONE]" in outbound_str

        asyncio.run(_run())

    def test_resilient_llm_fallback_redaction(self):
        async def _run():
            class FailingPrimary(LLMPort):
                async def complete(self, messages, *, tools=None, temperature=0.0, max_tokens=2048):
                    raise httpx.ConnectError("Primary provider connection timeout")

                async def stream(self, messages, *, tools=None, temperature=0.0):
                    raise httpx.ConnectError("Primary provider connection timeout")
                    yield

            class SpyFallback(LLMPort):
                def __init__(self):
                    self.received_messages: List[Dict[str, Any]] = []

                async def complete(self, messages, *, tools=None, temperature=0.0, max_tokens=2048):
                    self.received_messages = messages
                    return LLMResponse(content="Fallback response", provider="spy_fallback")

                async def stream(self, messages, *, tools=None, temperature=0.0):
                    self.received_messages = messages
                    yield

            primary = FailingPrimary()
            fallback_spy = SpyFallback()

            resilient = ResilientLLMClient(
                primary_client=primary,
                fallback_client=fallback_spy,
                max_retries=1,
            )

            messages = [{"role": "user", "content": "Khách hàng CCCD 001099012345 và email test@mwg.vn"}]
            resp = await resilient.complete(messages)

            assert resp.content == "Fallback response"
            received_str = json.dumps(fallback_spy.received_messages)
            assert "001099012345" not in received_str
            assert "test@mwg.vn" not in received_str
            assert "[REDACTED_CCCD]" in received_str
            assert "[REDACTED_EMAIL]" in received_str

        asyncio.run(_run())

    def test_fail_closed_prevents_provider_egress(self, monkeypatch):
        async def _run():
            provider_called = False

            def mock_handler(request: httpx.Request) -> httpx.Response:
                nonlocal provider_called
                provider_called = True
                return httpx.Response(200, json={"choices": []})

            transport = httpx.MockTransport(mock_handler)
            async with httpx.AsyncClient(transport=transport) as client:
                llm = OpenAICompatibleLLM(base_url="http://mock.internal", http_client=client)

                # Force PIIMasker.mask to fail
                def failing_mask(*args, **kwargs):
                    raise PIIRedactionError("Simulated internal masking corruption")

                monkeypatch.setattr(PIIMasker, "mask", failing_mask)

                with pytest.raises(PIIRedactionError):
                    await llm.complete([{"role": "user", "content": "Sensitive query"}])

                # Transport spy must NOT have been called!
                assert provider_called is False

        asyncio.run(_run())

    def test_openai_embedding_sync_and_async_redaction(self, monkeypatch):
        captured_payload: Dict[str, Any] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_payload
            captured_payload = json.loads(request.content.decode("utf-8"))
            mock_data = {
                "data": [
                    {"index": 0, "embedding": [0.1] * 1536},
                    {"index": 1, "embedding": [0.2] * 1536},
                ]
            }
            return httpx.Response(200, json=mock_data)

        emb_client = OpenAICompatibleEmbeddingClient(api_key="sk-test", base_url="http://mock-emb.internal")

        real_client_cls = httpx.Client

        def mock_client_factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_client_cls(*args, **kwargs)

        monkeypatch.setattr(httpx, "Client", mock_client_factory)

        texts = [
            "Hồ sơ khách hàng 001099012345",
            "Liên hệ hotline 0912345678",
        ]
        vectors = emb_client.embed_documents(texts)
        assert len(vectors) == 2
        payload_str = json.dumps(captured_payload)
        assert "001099012345" not in payload_str
        assert "0912345678" not in payload_str
        assert "[REDACTED_CCCD]" in payload_str
        assert "[REDACTED_PHONE]" in payload_str

    def test_remote_reranker_cohere_redaction(self, monkeypatch):
        captured_payload: Dict[str, Any] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            nonlocal captured_payload
            captured_payload = json.loads(request.content.decode("utf-8"))
            return httpx.Response(200, json={"results": [{"index": 0, "relevance_score": 0.98}]})

        cohere = CohereRerankerClient(api_key="test_cohere_key", base_url="http://mock-cohere.internal/rerank")

        real_client_cls = httpx.Client

        def mock_client_factory(*args, **kwargs):
            kwargs["transport"] = httpx.MockTransport(handler)
            return real_client_cls(*args, **kwargs)

        monkeypatch.setattr(httpx, "Client", mock_client_factory)

        docs = [{"snippet": "Khách hàng có số CCCD 001099012345 yêu cầu đổi máy"}]
        results = cohere.rerank(query="Tra cứu SĐT 0912345678", documents=docs)

        assert len(results) == 1
        payload_str = json.dumps(captured_payload)
        assert "001099012345" not in payload_str
        assert "0912345678" not in payload_str
        assert "[REDACTED_CCCD]" in payload_str
        assert "[REDACTED_PHONE]" in payload_str

    def test_true_llm_judge_redaction(self):
        async def _run():
            captured_prompt: str = ""

            class SpyJudgeLLM(LLMPort):
                async def complete(self, messages, *, tools=None, temperature=0.0, max_tokens=2048):
                    nonlocal captured_prompt
                    captured_prompt = messages[0]["content"]
                    return LLMResponse(content="SCORE: 0.95\nREASON: All facts match")

                async def stream(self, messages, *, tools=None, temperature=0.0):
                    yield

            judge = TrueLLMJudge(judge_llm=SpyJudgeLLM())
            res = await judge.evaluate(
                query="Khách hàng 0912345678 có đủ điều kiện hoàn tiền?",
                final_answer="Đơn hàng của chủ thẻ CCCD 001099012345 đủ điều kiện.",
                evidence_snippets=["Chính sách áp dụng khi gửi email xác nhận về info@mwg.vn"],
            )

            assert res.groundedness_score == 0.95
            assert "0912345678" not in captured_prompt
            assert "001099012345" not in captured_prompt
            assert "info@mwg.vn" not in captured_prompt
            assert "[REDACTED_PHONE]" in captured_prompt
            assert "[REDACTED_CCCD]" in captured_prompt
            assert "[REDACTED_EMAIL]" in captured_prompt

        asyncio.run(_run())


# ===========================================================================
# 3. Tool Outputs, Audit Ledger, ToolEvents & Logging Tests
# ===========================================================================
class TestToolOutputAuditAndLogs:
    """Verifies that tools, audit ledgers, events, and validation errors do not leak PII."""

    def test_tool_validation_error_masks_input(self):
        async def _run():
            class StrictPhoneInput(BaseModel):
                code: str = Field(..., pattern=r"^PROD-[0-9]{3}$")

            @tool(
                name="test_strict_tool",
                description="Tool requiring exact product code format",
                input_model=StrictPhoneInput,
                side_effect=False,
                allowed_roles=["customer", "admin"],
            )
            def test_strict_tool(args: StrictPhoneInput, ctx: ToolContext):
                return {"status": "ok"}

            registry = ToolRegistry()
            registry.register(test_strict_tool)
            executor = ToolExecutor(registry=registry, policy_engine=PolicyEngine({}))

            principal = Principal(user_id="cust_01", role="customer", tenant_id="retail")
            result = await executor.execute(
                tool_name="test_strict_tool",
                arguments={"code": "0912345678"},  # Fails pattern
                principal=principal,
            )

            assert result.is_error is True
            assert result.error_code == "validation_error"
            output_str = str(result.output)
            # Input value in validation error MUST be masked
            assert "0912345678" not in output_str
            assert "[REDACTED_PHONE]" in output_str

        asyncio.run(_run())

    def test_tool_execution_masks_raw_output_for_llm(self):
        async def _run():
            class EchoInput(BaseModel):
                query: str = Field(...)

            @tool(
                name="echo_customer_profile",
                description="Lookup customer profile",
                input_model=EchoInput,
                side_effect=False,
                allowed_roles=["customer", "admin"],
            )
            def echo_customer_profile(args: EchoInput, ctx: ToolContext):
                return {
                    "customer_name": "Nguyễn Văn B",
                    "national_id": "001099012345",
                    "phone": "0912345678",
                    "email": "vanb@gmail.com",
                }

            registry = ToolRegistry()
            registry.register(echo_customer_profile)
            executor = ToolExecutor(registry=registry, policy_engine=PolicyEngine({}))

            principal = Principal(user_id="cust_02", role="customer", tenant_id="retail")
            result = await executor.execute(
                tool_name="echo_customer_profile",
                arguments={"query": "profile"},
                principal=principal,
            )

            assert result.is_error is False
            output_str = str(result.output)
            # Verify wrapped <tool_output> contains ONLY masked fields
            assert "001099012345" not in output_str
            assert "0912345678" not in output_str
            assert "vanb@gmail.com" not in output_str
            assert "[REDACTED_CCCD]" in output_str
            assert "[REDACTED_PHONE]" in output_str
            assert "[REDACTED_EMAIL]" in output_str

        asyncio.run(_run())

    def test_workflow_tool_exec_node_arguments_and_output_masked(self):
        async def _run():
            class SecretInput(BaseModel):
                customer_ssn: str = Field(...)

            @tool(
                name="verify_ssn_tool",
                description="Verify SSN tool",
                input_model=SecretInput,
                side_effect=False,
                allowed_roles=["admin"],
            )
            def verify_ssn_tool(args: SecretInput, ctx: ToolContext):
                return {"verified": True, "notes": f"Identity {args.customer_ssn} verified."}

            registry = ToolRegistry()
            registry.register(verify_ssn_tool)
            executor = ToolExecutor(registry=registry, policy_engine=PolicyEngine({}))
            node = create_tool_exec_node(executor)

            principal = Principal(user_id="admin_01", role="admin", tenant_id="retail")
            state: AgentState = {
                "messages": [],
                "pending_tool_calls": [
                    {
                        "name": "verify_ssn_tool",
                        "arguments": {"customer_ssn": "001099012345"},
                        "id": "call_ssn_01",
                    }
                ],
                "principal": principal,
                "thread_id": "thread_test_01",
                "run_id": "run_test_01",
            }

            delta = await node(state)
            events = delta.get("tool_events", [])
            assert len(events) == 1
            ev = events[0]

            # Verify arguments and output inside ToolEvent are masked
            ev_args_str = json.dumps(ev.arguments)
            assert "001099012345" not in ev_args_str
            assert "[REDACTED_CCCD]" in ev_args_str

            assert "001099012345" not in ev.output
            assert "[REDACTED_CCCD]" in ev.output

            # Verify ToolMessage content is masked
            msg = delta["messages"][0]
            assert "001099012345" not in msg.content
            assert "[REDACTED_CCCD]" in msg.content

        asyncio.run(_run())

    def test_audit_ledger_input_masked_is_truly_masked(self):
        async def _run():
            class LookupInput(BaseModel):
                email: str = Field(...)
                phone: str = Field(...)

            @tool(
                name="lookup_lead",
                description="Lookup lead",
                input_model=LookupInput,
                side_effect=False,
                allowed_roles=["customer", "admin"],
            )
            def lookup_lead(args: LookupInput, ctx: ToolContext):
                return {"status": "found"}

            audit = TamperEvidentHashChainLedger()
            registry = ToolRegistry()
            registry.register(lookup_lead)
            executor = ToolExecutor(registry=registry, policy_engine=PolicyEngine({}), audit_ledger=audit)

            principal = Principal(user_id="cust_audit", role="customer", tenant_id="retail")
            await executor.execute(
                tool_name="lookup_lead",
                arguments={"email": "lead@customer.com", "phone": "0912345678"},
                principal=principal,
                call_id="call_audit_check",
            )

            # Inspect the audit entry
            events = audit.get_events()
            assert len(events) >= 1
            last_event = events[-1]
            audit_dump = json.dumps(last_event.input_masked)
            assert "lead@customer.com" not in audit_dump
            assert "0912345678" not in audit_dump
            assert "[REDACTED_EMAIL]" in audit_dump
            assert "[REDACTED_PHONE]" in audit_dump

        asyncio.run(_run())

    def test_logger_sanitizes_exceptions_with_caplog(self, caplog):
        async def _run():
            class FailingSensitiveLLM(LLMPort):
                async def complete(self, messages, *, tools=None, temperature=0.0, max_tokens=2048):
                    raise RuntimeError("Failed communicating for customer phone 0912345678 and CCCD 001099012345")

                async def stream(self, messages, *, tools=None, temperature=0.0):
                    raise RuntimeError("Failed stream for customer phone 0912345678 and CCCD 001099012345")
                    yield

            resilient = ResilientLLMClient(
                primary_client=FailingSensitiveLLM(),
                max_retries=0,
            )

            with caplog.at_level(logging.WARNING):
                with pytest.raises(RuntimeError):
                    await resilient.complete([{"role": "user", "content": "test"}])

            log_text = caplog.text
            assert "0912345678" not in log_text
            assert "001099012345" not in log_text
            assert "[REDACTED_PHONE]" in log_text
            assert "[REDACTED_CCCD]" in log_text

        asyncio.run(_run())


# ===========================================================================
# 4. Trusted Backend Boundary Tests
# ===========================================================================
class TestTrustedBackendBoundary:
    """Verifies that trusted backend receives authoritative business data according to contract,
    while untrusted LLM, audit, and logs receive only redacted views.
    """

    def test_trusted_backend_receives_unmasked_business_data(self):
        async def _run():
            backend_received_payload: Dict[str, Any] = {}

            class TicketInput(BaseModel):
                title: str
                description: str
                contact_phone: str

            @tool(
                name="submit_support_ticket",
                description="Submit support ticket to core backend",
                input_model=TicketInput,
                side_effect=True,
                allowed_roles=["customer", "admin"],
            )
            async def submit_support_ticket(args: TicketInput, ctx: ToolContext):
                nonlocal backend_received_payload
                # Simulate call to trusted backend
                backend_received_payload = {
                    "title": args.title,
                    "description": args.description,
                    "contact_phone": args.contact_phone,
                    "user_id": ctx.principal.user_id,
                }
                # Return receipt confirming creation
                return {
                    "status": "success",
                    "ticket_id": "TCK-9901",
                    "detail": f"Ticket recorded for phone {args.contact_phone}",
                }

            audit = TamperEvidentHashChainLedger()
            registry = ToolRegistry()
            registry.register(submit_support_ticket)
            executor = ToolExecutor(registry=registry, policy_engine=PolicyEngine({}), audit_ledger=audit)

            raw_user_description = "Laptop hỏng màn hình, liên hệ gấp qua số 0912345678 hoặc email lan@mwg.vn"
            principal = Principal(user_id="cust_real_01", role="customer", tenant_id="retail")

            result = await executor.execute(
                tool_name="submit_support_ticket",
                arguments={
                    "title": "Hỏng màn hình",
                    "description": raw_user_description,
                    "contact_phone": "0912345678",
                },
                principal=principal,
                call_id="call_tck_01",
            )

            # 1. Trusted backend received UNMASKED data needed for actual human technicians
            assert backend_received_payload["contact_phone"] == "0912345678"
            assert backend_received_payload["description"] == raw_user_description
            assert backend_received_payload["user_id"] == "cust_real_01"

            # 2. Output returned for LLM context is MASKED
            llm_output_str = str(result.output)
            assert "0912345678" not in llm_output_str
            assert "[REDACTED_PHONE]" in llm_output_str

            # 3. Audit ledger record is MASKED
            audit_str = json.dumps(audit.get_events()[-1].input_masked)
            assert "0912345678" not in audit_str
            assert "lan@mwg.vn" not in audit_str
            assert "[REDACTED_PHONE]" in audit_str
            assert "[REDACTED_EMAIL]" in audit_str

        asyncio.run(_run())
