import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx
import pytest

from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.idempotency import IdempotencyManager
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.request_credentials import _authorization


def test_concurrent_different_call_ids_block_same_pending_intent():
    manager = IdempotencyManager()
    def reserve(key):
        return manager.begin_execution(key, tenant_id='tenant', user_id='alice', tool_name='add_to_cart', arguments={'sku': 'ABC'})
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(reserve, ['call-a', 'call-b']))
    assert sorted(result.action for result in results) == ['proceed', 'unknown_outcome']
    manager.mark_unknown_outcome(next(k for k, value in manager._records.items() if value['status'] == 'in_progress'))
    assert reserve('call-c').action == 'unknown_outcome'
    assert manager.begin_execution('call-other', tenant_id='tenant', user_id='bob', tool_name='add_to_cart', arguments={'sku': 'ABC'}).action == 'proceed'


@pytest.mark.parametrize('failure', ['http_500', 'invalid_response', 'post_send_exception'])
def test_ambiguous_backend_response_blocks_new_call_id(monkeypatch, failure):
    registry = ToolRegistry()
    registry.load_from_module_file(Path('domains/retail_store/tools.py'))
    module = registry.get('add_to_cart').func.__globals__
    module['_NESTJS_OFFLINE_UNTIL'] = 0
    calls = []

    class Client:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, json, headers):
            calls.append(url)
            if failure == 'post_send_exception':
                raise httpx.ReadTimeout('read timeout')
            if failure == 'http_500':
                return httpx.Response(500, json={})
            return httpx.Response(200, json={'data': {'status': 'success'}})

    monkeypatch.setattr(httpx, 'AsyncClient', Client)
    executor = ToolExecutor(registry, PolicyEngine.load_from_file('domains/retail_store/policies.yaml'))
    principal = Principal(user_id='alice', role='customer')

    async def run():
        token = _authorization.set('Bearer test-only')
        try:
            first = await executor.execute('add_to_cart', {'sku': 'ABC'}, principal, thread_id='one', call_id='call-a')
            second = await executor.execute('add_to_cart', {'sku': 'ABC'}, principal, thread_id='two', call_id='call-b')
        finally:
            _authorization.reset(token)
        assert first.is_error and second.error_code == 'unknown_outcome'
        assert len(calls) == 1
        assert not executor.idempotency._store
    asyncio.run(run())
