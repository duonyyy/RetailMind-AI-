import json
from typing import List, Dict, Any, Optional, AsyncIterator
import httpx
from agent_platform.llm.base import LLMPort, LLMResponse, LLMChunk, ToolCall, Usage

class GeminiLLM(LLMPort):
    """
    Google Gemini Native REST Client supporting Function Calling and True SSE Streaming (Fixes A15).
    Communicates directly with Google AI Studio API without external bulky dependencies.
    """

    def __init__(
        self,
        api_key: str = "",
        model_name: str = "gemini-1.5-flash",
        timeout_seconds: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.timeout_seconds = timeout_seconds
        self._external_client = http_client
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

    def _convert_messages(self, messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Converts standard chat messages to Gemini contents format."""
        contents: List[Dict[str, Any]] = []
        for m in messages:
            role = m.get("role", "user")
            content = m.get("content", "")
            gemini_role = "model" if role in ("assistant", "model") else "user"

            parts: List[Dict[str, Any]] = []
            if content:
                parts.append({"text": str(content)})

            # Check if previous tool response
            if role == "tool":
                parts.append({
                    "functionResponse": {
                        "name": m.get("name", "tool_result"),
                        "response": {"output": content},
                    }
                })

            if parts:
                contents.append({"role": gemini_role, "parts": parts})
        return contents

    def _convert_tools(self, tools: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, Any]]]:
        """Converts standard tool specs to Gemini functionDeclarations format."""
        if not tools:
            return None
        declarations: List[Dict[str, Any]] = []
        for t in tools:
            spec = t.get("function", t)
            declarations.append({
                "name": spec.get("name", ""),
                "description": spec.get("description", ""),
                "parameters": spec.get("parameters", {}),
            })
        return [{"functionDeclarations": declarations}]

    async def complete(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        url = f"{self.base_url}/models/{self.model_name}:generateContent?key={self.api_key}"
        payload: Dict[str, Any] = {
            "contents": self._convert_messages(messages),
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }
        if gemini_tools := self._convert_tools(tools):
            payload["tools"] = gemini_tools

        client = self._external_client or httpx.AsyncClient(timeout=self.timeout_seconds)
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        finally:
            if not self._external_client:
                await client.aclose()

        candidates = data.get("candidates", [])
        content_text: Optional[str] = None
        tool_calls: List[ToolCall] = []

        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            for p in parts:
                if "text" in p:
                    content_text = (content_text or "") + p["text"]
                elif "functionCall" in p:
                    fc = p["functionCall"]
                    tool_calls.append(ToolCall(
                        id=f"gemini_call_{len(tool_calls) + 1}",
                        name=fc.get("name", ""),
                        arguments=fc.get("args", {}),
                    ))

        usage_meta = data.get("usageMetadata", {})
        usage = Usage(
            prompt_tokens=usage_meta.get("promptTokenCount", 0),
            completion_tokens=usage_meta.get("candidatesTokenCount", 0),
            total_tokens=usage_meta.get("totalTokenCount", 0),
        )

        return LLMResponse(
            content=content_text,
            tool_calls=tool_calls,
            usage=usage,
            model=self.model_name,
            provider="gemini",
        )

    async def stream(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMChunk]:
        """True SSE streaming using Gemini streamGenerateContent endpoint."""
        url = f"{self.base_url}/models/{self.model_name}:streamGenerateContent?alt=sse&key={self.api_key}"
        payload: Dict[str, Any] = {
            "contents": self._convert_messages(messages),
            "generationConfig": {"temperature": temperature},
        }
        if gemini_tools := self._convert_tools(tools):
            payload["tools"] = gemini_tools

        client = self._external_client or httpx.AsyncClient(timeout=self.timeout_seconds)
        try:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    try:
                        chunk_json = json.loads(data_str)
                        candidates = chunk_json.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            for p in parts:
                                if "text" in p and p["text"]:
                                    yield LLMChunk(delta_content=p["text"])
                                elif "functionCall" in p:
                                    fc = p["functionCall"]
                                    yield LLMChunk(tool_call_delta={
                                        "name": fc.get("name", ""),
                                        "args": fc.get("args", {}),
                                    })
                        if usage_meta := chunk_json.get("usageMetadata"):
                            yield LLMChunk(usage=Usage(
                                prompt_tokens=usage_meta.get("promptTokenCount", 0),
                                completion_tokens=usage_meta.get("candidatesTokenCount", 0),
                                total_tokens=usage_meta.get("totalTokenCount", 0),
                            ))
                    except Exception:
                        continue
        finally:
            if not self._external_client:
                await client.aclose()
