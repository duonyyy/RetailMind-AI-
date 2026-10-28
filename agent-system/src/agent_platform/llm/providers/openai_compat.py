import json
from typing import List, Dict, Any, Optional, AsyncIterator
import httpx
from agent_platform.llm.base import LLMPort, LLMResponse, LLMChunk, ToolCall, Usage

def _mask_pii(data: Any, fail_closed: bool = True) -> Any:
    from agent_platform.harness.guards.pii import PIIMasker
    return PIIMasker.mask(data, fail_closed=fail_closed)

class OpenAICompatibleLLM(LLMPort):
    """
    OpenAI-Compatible LLM Client supporting native Tool Calling and true SSE streaming.
    Works with OpenAI, vLLM, Ollama, LocalAI, and any OpenAI API spec conforming server.
    """

    def __init__(
        self,
        base_url: str = "https://api.openai.com/v1",
        api_key: str = "",
        model_name: str = "gpt-4o-mini",
        timeout_seconds: float = 20.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self._external_client = http_client

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _convert_tools(self, tools: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        if not tools:
            return None
        formatted = []
        for t in tools:
            if "type" in t and t["type"] == "function":
                formatted.append(t)
            else:
                formatted.append({
                    "type": "function",
                    "function": {
                        "name": t.get("name", "unknown_tool"),
                        "description": t.get("description", ""),
                        "parameters": t.get("parameters", {}),
                    }
                })
        return formatted

    async def complete(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        # Fail-closed PII redaction before provider egress
        redacted_messages = _mask_pii(messages, fail_closed=True)
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": redacted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if formatted_tools := self._convert_tools(tools):
            payload["tools"] = formatted_tools

        client = self._external_client or httpx.AsyncClient(timeout=self.timeout_seconds)
        try:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as exc:
            safe_text = _mask_pii(exc.response.text[:300], fail_closed=False) if exc.response is not None else ""
            raise RuntimeError(f"OpenAI completion failed [{exc.response.status_code}]: {safe_text}") from None
        except Exception as exc:
            if isinstance(exc, RuntimeError) and "OpenAI completion failed" in str(exc):
                raise
            safe_msg = _mask_pii(str(exc), fail_closed=False)
            raise RuntimeError(f"OpenAI completion request error: {safe_msg}") from None
        finally:
            if not self._external_client:
                await client.aclose()

        choice = data["choices"][0]["message"]
        content = choice.get("content")

        tool_calls: List[ToolCall] = []
        if raw_tool_calls := choice.get("tool_calls"):
            for tc in raw_tool_calls:
                func = tc.get("function", {})
                args_str = func.get("arguments", "{}")
                try:
                    args = json.loads(args_str) if isinstance(args_str, str) else args_str
                except Exception:
                    args = {}
                tool_calls.append(ToolCall(
                    id=tc.get("id", f"call_{len(tool_calls)}"),
                    name=func.get("name", ""),
                    arguments=args if isinstance(args, dict) else {},
                ))

        usage_data = data.get("usage", {}) or {}
        prompt_details = usage_data.get("prompt_tokens_details", {}) or {}
        cached_tokens = prompt_details.get("cached_tokens", 0) or usage_data.get("cached_tokens", 0)
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            cached_prompt_tokens=cached_tokens,
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            usage=usage,
            model=data.get("model", self.model_name),
            provider="openai_compat",
        )

    async def stream(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMChunk]:
        # Fail-closed PII redaction before provider egress
        redacted_messages = _mask_pii(messages, fail_closed=True)
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": redacted_messages,
            "temperature": temperature,
            "stream": True,
        }
        if formatted_tools := self._convert_tools(tools):
            payload["tools"] = formatted_tools

        client = self._external_client or httpx.AsyncClient(timeout=self.timeout_seconds)
        try:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        choice = chunk_json.get("choices", [{}])[0]
                        delta = choice.get("delta", {})

                        if "content" in delta and delta["content"]:
                            yield LLMChunk(delta_content=delta["content"])

                        if "tool_calls" in delta:
                            for tc in delta["tool_calls"]:
                                yield LLMChunk(tool_call_delta=tc)

                        if "usage" in chunk_json and chunk_json["usage"]:
                            u = chunk_json["usage"]
                            yield LLMChunk(usage=Usage(
                                prompt_tokens=u.get("prompt_tokens", 0),
                                completion_tokens=u.get("completion_tokens", 0),
                                total_tokens=u.get("total_tokens", 0),
                            ))
                    except Exception:
                        continue
        finally:
            if not self._external_client:
                await client.aclose()
