"""Graph tests use a scripted model and fake Core responses; no live integrations."""
import asyncio
from pathlib import Path

import pytest
from pydantic import BaseModel

from agent_platform.agents.workflow.builder import build_agent_graph
from agent_platform.agents.workflow.runner import AgentRunner
from agent_platform.domain.pack import DomainPack
from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.harness.tools.spec import ToolContext, tool
from agent_platform.llm.providers.scripted import ScriptedLLM


@pytest.fixture
def graph_setup(monkeypatch):
    domain = Path('domains/retail_store')
    pack = DomainPack.load_from_dir(domain)
    registry = ToolRegistry()
    registry.load_from_module_file(domain / 'tools.py')
    async def core(endpoint, payload, ctx):
        return {'order_id': payload['order_id'], 'order_status': 'PLACED'}
    monkeypatch.setitem(registry.get('query_order_status').func.__globals__, '_call_nestjs_tool', core)
    return pack, registry, domain


def execute_graph(setup, tool_name, order_id, answer, role='customer'):
    pack, registry, domain = setup
    llm = ScriptedLLM()
    llm.queue_tool_call(tool_name, {'order_id': order_id}, 'call-1')
    llm.queue_answer(answer)
    llm.queue_answer(answer)
    executor = ToolExecutor(registry, PolicyEngine.load_from_file(domain / 'policies.yaml'))
    runner = AgentRunner(build_agent_graph(pack, llm, registry, executor))
    return asyncio.run(runner.execute('Tra cứu đơn hàng', Principal(user_id='alice', role=role)))


@pytest.mark.parametrize('tool_name,order_id', [
    ('query_order_status', 'ORD-100201'), ('lookup_order', 'MWG-20261030-A1B2C3D4'),
])
def test_confirmed_order_status_is_business_grounding_not_citation(graph_setup, tool_name, order_id):
    answer = f'Đơn hàng {order_id} có trạng thái PLACED.'
    state = execute_graph(graph_setup, tool_name, order_id, answer)
    assert state['status'] == 'done'
    assert state['grounding_status'] == 'verified_commerce'
    assert state['final_answer'] == answer
    assert state['matched_evidence'] == [] and state['grounding_score'] is None


@pytest.mark.parametrize('answer', [
    'Đơn hàng ORD-100201 có trạng thái COMPLETED.',
    'Đơn hàng ORD-100201 có trạng thái PLACED. Bạn sẽ nhận hàng ngày mai.',
])
def test_model_may_not_add_or_change_claims(graph_setup, answer):
    state = execute_graph(graph_setup, 'query_order_status', 'ORD-100201', answer)
    assert state['status'] == 'abstained'
    assert answer not in state['final_answer']
    assert state['matched_evidence'] == []


def test_unsupported_core_status_is_unavailable(graph_setup, monkeypatch):
    _, registry, _ = graph_setup
    async def invalid(*args, **kwargs):
        return {'order_id': 'ORD-100201', 'order_status': 'SHIPPED'}
    monkeypatch.setitem(registry.get('query_order_status').func.__globals__, '_call_nestjs_tool', invalid)
    state = execute_graph(graph_setup, 'query_order_status', 'ORD-100201', 'Đơn hàng ORD-100201 có trạng thái SHIPPED.')
    assert state['status'] == 'abstained' and state.get('verified_commerce_answer') is None


def test_core_denial_or_unavailability_never_produces_a_verified_answer(graph_setup, monkeypatch):
    _, registry, _ = graph_setup
    async def denied(*args, **kwargs): return None
    monkeypatch.setitem(registry.get('query_order_status').func.__globals__, '_call_nestjs_tool', denied)
    state = execute_graph(graph_setup, 'query_order_status', 'ORD-100201', 'Đơn hàng ORD-100201 có trạng thái PLACED.')
    assert state['status'] == 'abstained' and state.get('verified_commerce_answer') is None


def test_guest_cannot_get_order_status_fact(graph_setup):
    state = execute_graph(graph_setup, 'query_order_status', 'ORD-100201', 'Đơn hàng ORD-100201 có trạng thái PLACED.', role='guest')
    assert state['status'] == 'abstained' and state.get('verified_commerce_answer') is None


def test_source_label_alone_cannot_create_business_grounding(graph_setup):
    pack, registry, domain = graph_setup
    class Input(BaseModel):
        order_id: str
    @tool(name='query_order_status', description='test', input_model=Input, allowed_roles=['customer'])
    async def fake(args: Input, ctx: ToolContext):
        return {'status': 'success', 'source': 'nestjs_commerce_ssot', 'order_id': args.order_id, 'order_status': 'PLACED'}
    registry.register(fake)
    state = execute_graph((pack, registry, domain), 'query_order_status', 'ORD-100201', 'Đơn hàng ORD-100201 có trạng thái PLACED.')
    assert state['status'] == 'abstained' and state.get('verified_commerce_answer') is None


def test_active_domain_knowledge_tool_stays_unavailable(graph_setup):
    pack, registry, domain = graph_setup
    llm = ScriptedLLM()
    llm.queue_tool_call('search_knowledge', {'query': 'đổi trả'}, 'policy-call')
    executor = ToolExecutor(registry, PolicyEngine.load_from_file(domain / 'policies.yaml'))
    runner = AgentRunner(build_agent_graph(pack, llm, registry, executor))
    state = asyncio.run(runner.execute('Chính sách đổi trả?', Principal(user_id='alice', role='customer')))
    assert state['status'] == 'abstained'
    assert state['matched_evidence'] == [] and state.get('verified_commerce_answer') is None
    assert '30 ngày' not in state['final_answer']


def test_loading_domain_does_not_initialize_unverified_retrieval(monkeypatch):
    from agent_platform.rag.retrieval.hybrid_engine import ProductionHybridRetriever
    def forbidden_init(*args, **kwargs):
        raise AssertionError('unverified index must not be initialized')
    monkeypatch.setattr(ProductionHybridRetriever, '__init__', forbidden_init)
    registry = ToolRegistry()
    registry.load_from_module_file(Path('domains/retail_store/tools.py'))
    assert registry.get('search_knowledge') is not None


def test_business_fact_is_not_reused_on_a_later_turn(graph_setup):
    from langgraph.checkpoint.memory import MemorySaver
    pack, registry, domain = graph_setup
    llm = ScriptedLLM()
    llm.queue_tool_call('query_order_status', {'order_id': 'ORD-100201'}, 'call-1')
    answer = 'Đơn hàng ORD-100201 có trạng thái PLACED.'
    llm.queue_answer(answer)
    llm.queue_answer(answer)
    llm.queue_answer(answer)
    executor = ToolExecutor(registry, PolicyEngine.load_from_file(domain / 'policies.yaml'))
    runner = AgentRunner(build_agent_graph(pack, llm, registry, executor, checkpointer=MemorySaver()))
    async def run():
        principal = Principal(user_id='alice', role='customer')
        first = await runner.execute('Tra cứu đơn', principal, thread_id='test-thread')
        second = await runner.execute('Kiểm tra lại đơn', principal, thread_id='test-thread')
        assert first['grounding_status'] == 'verified_commerce' and first['status'] == 'done'
        assert second['status'] == 'abstained' and second.get('verified_commerce_answer') is None
    asyncio.run(run())


def test_http_and_sse_expose_business_grounding_without_document_citations(graph_setup):
    from types import SimpleNamespace
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from agent_platform.api.deps import get_optional_principal
    from agent_platform.api.routers import chat
    from agent_platform.harness.persistence.memory.adapter import MemoryKVStore

    app = FastAPI()
    app.include_router(chat.router)
    app.dependency_overrides[get_optional_principal] = lambda: Principal(user_id='alice', role='customer')
    async def execute(query, principal, thread_id):
        pack, registry, domain = graph_setup
        llm = ScriptedLLM()
        llm.queue_tool_call('query_order_status', {'order_id': 'ORD-100201'}, 'call-1')
        llm.queue_answer('Đơn hàng ORD-100201 có trạng thái PLACED.')
        executor = ToolExecutor(registry, PolicyEngine.load_from_file(domain / 'policies.yaml'))
        return await AgentRunner(build_agent_graph(pack, llm, registry, executor)).execute(query, principal, thread_id=thread_id)
    app.state.harness = SimpleNamespace(kv_store=MemoryKVStore(), execute=execute)
    with TestClient(app) as client:
        result = client.post('/v1/chat', json={'query': 'Tra cứu đơn hàng'})
        assert result.status_code == 200
        assert result.json()['grounding_status'] == 'verified_commerce'
        assert result.json()['citations'] == []
        response = client.post('/v1/chat/stream', json={'query': 'Tra cứu đơn hàng'})
        assert response.status_code == 200
        assert 'verified_commerce' in response.text and 'citations' not in response.text
