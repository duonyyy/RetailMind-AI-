import asyncio
from pathlib import Path
from typing import Dict, Any
from langchain_core.messages import HumanMessage
from agent_platform.agents.base import BaseAgent
from agent_platform.agents.enterprise_agent import EnterpriseAgent
from agent_platform.domain.pack import DomainPack
from agent_platform.domain.registry import DomainRegistry
from agent_platform.llm.providers.scripted import ScriptedLLM
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.builtin.search_knowledge import search_knowledge
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.state.contracts import AgentState

class MockWorkerAgent(BaseAgent):
    """Custom test agent subclassing BaseAgent."""
    def __init__(self, name: str = "worker_1") -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    async def process(self, state: AgentState) -> Dict[str, Any]:
        return {"final_answer": f"Processed by {self.name}"}

def setup_agent_fixtures():
    domain_dir = Path(__file__).parents[2] / "domains" / "retail_store"
    pack = DomainPack.load_from_dir(domain_dir)

    tools = ToolRegistry()
    tools.register(search_knowledge)
    llm = ScriptedLLM()

    agent = EnterpriseAgent(pack=pack, llm=llm, tool_registry=tools)
    return pack, tools, llm, agent

def test_base_agent_interface():
    async def _run():
        agent = MockWorkerAgent(name="custom_worker")
        assert agent.name == "custom_worker"
        assert callable(agent.as_node())

        # Test direct invocation through __call__
        state = {"messages": [], "step_count": 0}
        res = await agent(state)
        assert res["final_answer"] == "Processed by custom_worker"

    asyncio.run(_run())

def test_enterprise_agent_direct_call_final_answer():
    async def _run():
        pack, tools, llm, agent = setup_agent_fixtures()
        llm.queue_answer("Chào bạn, tôi là trợ lý ảo hỗ trợ thông tin.")

        principal = Principal(user_id="u1", role="customer")
        state: AgentState = {
            "thread_id": "t1",
            "run_id": "r1",
            "principal": principal,
            "domain": pack.name,
            "prompt_version": "1.0",
            "messages": [HumanMessage(content="Xin chào")],
            "step_count": 0,
            "critic_cycles": 0,
            "critic_feedback": None,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        # Invoke directly as a callable object
        updates = await agent(state)

        assert updates["step_count"] == 1
        assert updates["final_answer"] == "Chào bạn, tôi là trợ lý ảo hỗ trợ thông tin."
        assert len(updates["pending_tool_calls"]) == 0
        assert len(updates["messages"]) == 1

    asyncio.run(_run())

def test_enterprise_agent_tool_calling_delta():
    async def _run():
        pack, tools, llm, agent = setup_agent_fixtures()
        llm.queue_tool_call(
            tool_name="search_knowledge",
            arguments={"query": "thời gian đổi trả"},
            call_id="call_agent_01",
        )

        principal = Principal(user_id="u2", role="customer")
        state: AgentState = {
            "thread_id": "t2",
            "run_id": "r2",
            "principal": principal,
            "domain": pack.name,
            "prompt_version": "1.0",
            "messages": [HumanMessage(content="Chính sách đổi trả thế nào?")],
            "step_count": 1,
            "critic_cycles": 0,
            "critic_feedback": None,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        updates = await agent(state)

        assert updates["step_count"] == 2
        assert len(updates["pending_tool_calls"]) == 1
        assert updates["pending_tool_calls"][0]["name"] == "search_knowledge"
        assert updates["messages"][0].tool_calls[0]["name"] == "search_knowledge"

    asyncio.run(_run())

def test_enterprise_agent_exceed_max_steps():
    async def _run():
        pack, tools, llm, agent = setup_agent_fixtures()
        principal = Principal(user_id="u3", role="guest")

        state: AgentState = {
            "thread_id": "t3",
            "run_id": "r3",
            "principal": principal,
            "domain": pack.name,
            "prompt_version": "1.0",
            "messages": [HumanMessage(content="Lặp vô tận")],
            "step_count": pack.limits.max_steps,  # next step will exceed
            "critic_cycles": 0,
            "critic_feedback": None,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        updates = await agent(state)

        assert updates["status"] == "abstained"
        assert "vượt quá giới hạn số bước" in updates["final_answer"]

    asyncio.run(_run())

def test_enterprise_agent_critic_feedback_injection():
    async def _run():
        pack, tools, llm, agent = setup_agent_fixtures()
        llm.queue_answer("Đã điều chỉnh câu trả lời theo góp ý của giám sát viên.")

        principal = Principal(user_id="u4", role="customer")
        critic_warning = "Phải trích dẫn nguồn tài liệu cụ thể."
        state: AgentState = {
            "thread_id": "t4",
            "run_id": "r4",
            "principal": principal,
            "domain": pack.name,
            "prompt_version": "1.0",
            "messages": [HumanMessage(content="Câu trả lời")],
            "step_count": 1,
            "critic_cycles": 1,
            "critic_feedback": critic_warning,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        updates = await agent(state)
        # Verify that llm received the critic feedback in the system prompt
        last_call_messages = llm.history_calls[-1]
        system_msg = next(m for m in last_call_messages if m["role"] == "system")
        assert critic_warning in system_msg["content"]

    asyncio.run(_run())

def test_enterprise_agent_context_compression_triggers_on_long_dialogue():
    async def _run():
        pack, tools, llm, agent = setup_agent_fixtures()
        llm.queue_answer("Tôi đã ghi nhận và tiếp tục hỗ trợ bạn.")

        principal = Principal(user_id="u_long", role="customer")
        # Construct 8 turns exceeding the 6 threshold
        messages = [
            HumanMessage(content="Turn 1: Khách hàng tìm Laptop LAP-DELL-01 ngân sách 20 triệu"),
            HumanMessage(content="Turn 2: Hỏi thêm bảo hành"),
            HumanMessage(content="Turn 3: Hỏi về phương thức thanh toán"),
            HumanMessage(content="Turn 4: Hỏi về thời gian giao hàng"),
            HumanMessage(content="Turn 5: Yêu cầu giao trước 17h bắt buộc"),
            HumanMessage(content="Turn 6: Đổi địa chỉ nhận"),
            HumanMessage(content="Turn 7: Xác nhận đơn"),
            HumanMessage(content="Turn 8: Câu hỏi mới nhất"),
        ]
        state: AgentState = {
            "thread_id": "t_long",
            "run_id": "r_long",
            "principal": principal,
            "domain": pack.name,
            "prompt_version": "1.0",
            "messages": messages,
            "step_count": 1,
            "critic_cycles": 0,
            "critic_feedback": None,
            "evidence": [],
            "tool_events": [],
            "pending_tool_calls": [],
            "final_answer": None,
            "grounding_score": None,
            "status": "running",
        }

        updates = await agent(state)
        assert updates["final_answer"] == "Tôi đã ghi nhận và tiếp tục hỗ trợ bạn."

        # Verify compression summary was injected into llm_messages
        last_call_messages = llm.history_calls[-1]
        summary_msg = next((m for m in last_call_messages if "[TÓM TẮT TIẾN TRÌNH HỘI THOẠI TRƯỚC ĐÓ]" in m["content"]), None)
        assert summary_msg is not None
        # Verify durable notes extracted SKU and constraints from older turns
        assert "LAP-DELL-01" in summary_msg["content"] or "ngân sách" in summary_msg["content"]
        # Verify the most recent turn is preserved
        assert any("Turn 8: Câu hỏi mới nhất" in m.get("content", "") for m in last_call_messages)

    asyncio.run(_run())

