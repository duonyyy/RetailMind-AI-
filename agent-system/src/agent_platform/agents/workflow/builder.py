from typing import Literal
from langgraph.graph import StateGraph, START, END
from agent_platform.harness.state.contracts import AgentState
from agent_platform.domain.pack import DomainPack
from agent_platform.llm.base import LLMPort
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.agents.workflow.nodes.input_guard import input_guard_node
from agent_platform.agents.workflow.nodes.agent import create_agent_node
from agent_platform.agents.workflow.nodes.tool_exec import create_tool_exec_node
from agent_platform.agents.workflow.nodes.critic import critic_node
from agent_platform.agents.workflow.nodes.finalize import finalize_node
from agent_platform.agents.workflow.nodes.abstain import abstain_node

def build_orchestration_graph(
    pack: DomainPack,
    llm: LLMPort,
    registry: ToolRegistry,
    executor: ToolExecutor,
    checkpointer=None,
):
    """
    Constructs the enterprise cyclic LangGraph orchestration graph.
    Connects safety guards, agent reasoning node, tool executor, critic reflection cycle,
    and output finalization.
    """
    builder = StateGraph(AgentState)

    # 1. Register Orchestration Nodes
    builder.add_node("input_guard", input_guard_node)
    builder.add_node("agent", create_agent_node(llm, registry, pack))
    builder.add_node("tool_exec", create_tool_exec_node(executor))
    builder.add_node("critic", critic_node)
    builder.add_node("finalize", finalize_node)
    builder.add_node("abstain", abstain_node)

    # 2. Wire START to input guard
    builder.add_edge(START, "input_guard")

    # 3. Conditional routing from input_guard
    def route_after_input_guard(state: AgentState) -> Literal["abstain", "agent"]:
        if state.get("status") == "abstained":
            return "abstain"
        return "agent"

    builder.add_conditional_edges("input_guard", route_after_input_guard)

    # 4. Conditional routing from agent
    def route_after_agent(state: AgentState) -> Literal["abstain", "tool_exec", "critic"]:
        if state.get("status") == "abstained":
            return "abstain"
        if state.get("pending_tool_calls"):
            return "tool_exec"
        return "critic"

    builder.add_conditional_edges("agent", route_after_agent)

    # 5. Conditional routing from tool_exec
    def route_after_tool_exec(state: AgentState) -> Literal["agent", "abstain", END]:
        if state.get("status") == "abstained":
            return "abstain"
        if state.get("status") == "awaiting_approval":
            return END
        if state.get("status") == "unknown_outcome":
            return END
        if state.get("status") == "done" and state.get("grounding_status") == "verified_commerce":
            return END
        return "agent"

    builder.add_conditional_edges("tool_exec", route_after_tool_exec)

    # 6. Conditional routing from critic (True reflection cycle)
    def route_after_critic(state: AgentState) -> Literal["finalize", "agent", "abstain"]:
        cycles = state.get("critic_cycles", 0)

        if state.get("grounding_status") in ("exact_quote", "not_applicable", "verified_commerce"):
            return "finalize"
        if cycles < pack.limits.max_critic_cycles:
            return "agent"
        return "abstain"

    builder.add_conditional_edges("critic", route_after_critic)

    # 7. Terminating edges
    builder.add_edge("finalize", END)
    builder.add_edge("abstain", END)

    return builder.compile(checkpointer=checkpointer)

# Backward-compatible alias
build_agent_graph = build_orchestration_graph
