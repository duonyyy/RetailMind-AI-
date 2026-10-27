from typing import List, Dict, Any, Optional, AsyncIterator
from agent_platform.llm.base import LLMPort, LLMResponse, LLMChunk, Usage

class MockLLMClient(LLMPort):
    """
    Offline mock LLM client.
    Contains strictly generic conversational responses, completely free of hardcoded domain logic.
    """

    def __init__(self, model_name: str = "mock-offline") -> None:
        self.model_name = model_name

    async def complete(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        last_msg = messages[-1]["content"] if messages else ""
        return LLMResponse(
            content=f"[Mock Response] Received message: '{last_msg[:60]}...'",
            tool_calls=[],
            usage=Usage(prompt_tokens=25, completion_tokens=15, total_tokens=40),
            model=self.model_name,
            provider="mock",
        )

    async def stream(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
    ) -> AsyncIterator[LLMChunk]:
        resp = await self.complete(messages, tools=tools, temperature=temperature)
        if resp.content:
            yield LLMChunk(delta_content=resp.content)
        yield LLMChunk(usage=resp.usage)
