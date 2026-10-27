from typing import List, Dict, Any, Optional, AsyncIterator
from agent_platform.llm.base import LLMPort, LLMResponse, LLMChunk, ToolCall, Usage

class ScriptedStep:
    """Pre-defined behavior for a single LLM invocation."""
    def __init__(
        self,
        content: Optional[str] = None,
        tool_calls: Optional[List[ToolCall]] = None,
        prompt_tokens: int = 50,
        completion_tokens: int = 50,
    ) -> None:
        self.content = content
        self.tool_calls = tool_calls or []
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

class ScriptedLLM(LLMPort):
    """
    Deterministic scripted LLM provider for unit tests, workflow simulation, and smoke benchmarks.
    Contains ZERO domain business logic, fully avoiding data contamination (Fixes A12).
    """

    def __init__(
        self,
        script: Optional[List[ScriptedStep]] = None,
        model_name: str = "scripted-v3",
    ) -> None:
        self.script: List[ScriptedStep] = list(script) if script else []
        self.history_calls: List[List[Dict[str, Any]]] = []
        self.current_index: int = 0
        self.model_name = model_name

    def queue_step(self, step: ScriptedStep) -> None:
        """Appends a scripted step to the queue."""
        self.script.append(step)

    def queue_tool_call(self, tool_name: str, arguments: Dict[str, Any], call_id: str = "call_001") -> None:
        """Convenience method to queue a tool call step."""
        self.script.append(
            ScriptedStep(
                content=None,
                tool_calls=[ToolCall(id=call_id, name=tool_name, arguments=arguments)],
            )
        )

    def queue_answer(self, content: str) -> None:
        """Convenience method to queue a final answer step."""
        self.script.append(ScriptedStep(content=content, tool_calls=[]))

    async def complete(
        self,
        messages: List[Dict[str, Any]],
        *,
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.0,
        max_tokens: int = 2048,
    ) -> LLMResponse:
        self.history_calls.append(messages)

        if self.current_index < len(self.script):
            step = self.script[self.current_index]
            self.current_index += 1
            return LLMResponse(
                content=step.content,
                tool_calls=step.tool_calls,
                usage=Usage(
                    prompt_tokens=step.prompt_tokens,
                    completion_tokens=step.completion_tokens,
                    total_tokens=step.prompt_tokens + step.completion_tokens,
                ),
                model=self.model_name,
                provider="scripted",
            )

        # Fallback if script is exhausted
        return LLMResponse(
            content="[ScriptedLLM: Script queue exhausted]",
            tool_calls=[],
            usage=Usage(prompt_tokens=10, completion_tokens=10, total_tokens=20),
            model=self.model_name,
            provider="scripted",
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
            # Yield tokens in chunks to simulate streaming
            words = resp.content.split(" ")
            for w in words:
                yield LLMChunk(delta_content=w + " ")
        if resp.tool_calls:
            for tc in resp.tool_calls:
                yield LLMChunk(tool_call_delta=tc.model_dump())
        yield LLMChunk(usage=resp.usage)
