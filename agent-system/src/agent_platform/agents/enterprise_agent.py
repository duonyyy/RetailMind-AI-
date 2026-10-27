from __future__ import annotations
from typing import TYPE_CHECKING, List, Dict, Any, Optional
from langchain_core.messages import SystemMessage, AIMessage, HumanMessage, ToolMessage
from agent_platform.agents.base import BaseAgent
from agent_platform.domain.pack import DomainPack
from agent_platform.llm.base import LLMPort
from agent_platform.harness.tools.registry import ToolRegistry

if TYPE_CHECKING:
    from agent_platform.harness.state.contracts import AgentState
    from agent_platform.harness.state.principal import Principal

class EnterpriseAgent(BaseAgent):
    """
    Production-grade enterprise reasoning agent.
    Encapsulates:
    - DomainPack (System & Critic prompts, limits, metadata)
    - LLMPort (Model provider abstraction with resilient fallback)
    - ToolRegistry (Server-side schema filtering based on Principal role)

    Adheres to:
    - Zero Domain in Core: Business logic resides strictly in DomainPack.
    - True Reflection: Reacts to critic_feedback from preceding cycles.
    - Python Callable Node: Can be used standalone or as a LangGraph node.
    """

    def __init__(
        self,
        pack: DomainPack,
        llm: LLMPort,
        tool_registry: ToolRegistry,
        name: Optional[str] = None,
    ) -> None:
        self.pack = pack
        self.llm = llm
        self.tool_registry = tool_registry
        self._name = name or f"{pack.name}_specialist"

    @property
    def name(self) -> str:
        return self._name

    async def process(self, state: AgentState) -> Dict[str, Any]:
        """
        Executes one reasoning turn:
        1. Checks max_steps boundary.
        2. Injects system prompt and any reflection feedback from the Critic.
        3. Retrieves role-filtered tool schemas.
        4. Calls LLM with tool calling capabilities.
        5. Returns structured state delta.
        """
        step_count = state.get("step_count", 0) + 1
        principal = state.get("principal")
        user_role = principal.role if principal else "guest"
        messages = list(state.get("messages", []))

        # 1. Check max steps boundary
        if step_count > self.pack.limits.max_steps:
            return {
                "step_count": step_count,
                "status": "abstained",
                "final_answer": "Phiên xử lý đã vượt quá giới hạn số bước cho phép của hệ thống.",
                "pending_tool_calls": [],
            }

        # 2. Format system prompt with reflection feedback from Critic
        sys_prompt = self.pack.get_system_prompt()
        if feedback := state.get("critic_feedback"):
            sys_prompt += f"\n\n[LƯU Ý TỪ GIÁM SÁT VIÊN Ở CHU KỲ TRƯỚC]: {feedback}"

        llm_messages: List[Dict[str, Any]] = [{"role": "system", "content": sys_prompt}]
        for m in messages:
            if isinstance(m, HumanMessage):
                llm_messages.append({"role": "user", "content": m.content})
            elif isinstance(m, AIMessage):
                llm_messages.append({"role": "assistant", "content": m.content or ""})
            elif isinstance(m, ToolMessage):
                llm_messages.append({
                    "role": "tool",
                    "content": m.content,
                    "name": getattr(m, "name", "tool"),
                })

        # 3. Server-side RBAC: only pass schemas allowed for the principal's role
        schemas = self.tool_registry.get_schemas(allowed_for_role=user_role)

        # 4. Invoke LLMPort
        resp = await self.llm.complete(
            llm_messages,
            tools=schemas if schemas else None,
            temperature=0.0,
        )

        updates: Dict[str, Any] = {"step_count": step_count}

        # 5. Process tool calls vs final answer
        if resp.tool_calls:
            raw_calls = [tc.model_dump() for tc in resp.tool_calls]
            lc_tool_calls = [
                {"name": tc.name, "args": tc.arguments, "id": tc.id}
                for tc in resp.tool_calls
            ]
            updates["pending_tool_calls"] = raw_calls
            updates["messages"] = [AIMessage(content=resp.content or "", tool_calls=lc_tool_calls)]
        else:
            updates["final_answer"] = resp.content
            updates["pending_tool_calls"] = []
            updates["messages"] = [AIMessage(content=resp.content or "")]

        return updates
