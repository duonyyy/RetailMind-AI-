import asyncio
from pathlib import Path

import httpx
import pytest

from agent_platform.harness.governance.policy import PolicyEngine
from agent_platform.harness.state.principal import Principal
from agent_platform.harness.tools.executor import ToolExecutor
from agent_platform.harness.tools.registry import ToolRegistry
from agent_platform.request_credentials import _authorization

CASES = [
    ('lookup_laptop_catalog', {}, {'count': 1, 'laptops': [{'sku': 'ABC', 'name': 'A', 'price_vnd': '100'}]}),
    ('get_product_details', {'sku': 'ABC'}, {'sku': 'ABC', 'name': 'A', 'priceVnd': '100'}),
    ('compare_products', {'skus': ['ABC', 'DEF']}, {'total': 2, 'comparison': [
        {'sku': 'ABC', 'name': 'A', 'priceVnd': '100'}, {'sku': 'DEF', 'name': 'B', 'priceVnd': '200'}]}),
    ('manage_favorite', {'sku': 'ABC', 'action': 'add'},
     {'status': 'success', 'customer_id': 'alice', 'sku': 'ABC', 'action': 'add', 'is_favorited': True}),
]


@pytest.fixture(scope='module')
def registry():
    result = ToolRegistry()
    result.load_from_module_file(Path('domains/retail_store/tools.py'))
    return result


def run_tool(registry, name, args):
    executor = ToolExecutor(registry, PolicyEngine.load_from_file('domains/retail_store/policies.yaml'))
    async def run():
        credential = _authorization.set('Bearer test-only')
        try:
            return await executor.execute(name, args, Principal(user_id='alice', role='customer'))
        finally:
            _authorization.reset(credential)
    return asyncio.run(run()), executor


@pytest.mark.parametrize('name,args,valid', CASES)
@pytest.mark.parametrize('failure', ['500', 'timeout', 'invalid_json', 'empty', 'wrong_schema'])
def test_unconfirmed_results_never_return_success(registry, monkeypatch, name, args, valid, failure):
    module = registry.get(name).func.__globals__
    module['_NESTJS_OFFLINE_UNTIL'] = 0
    class Client:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, json, headers):
            if failure == 'timeout': raise httpx.ReadTimeout('timeout')
            if failure == '500': return httpx.Response(500, json={})
            if failure == 'invalid_json': return httpx.Response(200, text='invalid')
            if failure == 'empty': return httpx.Response(200, json={'data': {}})
            return httpx.Response(200, json={'data': {'status': 'success', 'laptops': 'bad', 'comparison': 'bad'}})
    monkeypatch.setattr(httpx, 'AsyncClient', Client)
    result, executor = run_tool(registry, name, args)
    assert result.is_error
    assert result.error_code == ('unknown_outcome' if name == 'manage_favorite' else 'unavailable')
    assert not executor.idempotency._store


@pytest.mark.parametrize('name,args,valid', CASES)
def test_confirmed_core_response_is_used(registry, monkeypatch, name, args, valid):
    async def backend(*unused, **kwargs): return valid
    monkeypatch.setitem(registry.get(name).func.__globals__, '_call_nestjs_tool', backend)
    result, _ = run_tool(registry, name, args)
    assert not result.is_error
    assert 'nestjs_commerce_ssot' in result.output


def test_empty_catalog_is_a_confirmed_empty_result(registry, monkeypatch):
    async def backend(*unused, **kwargs): return {'count': 0, 'laptops': []}
    monkeypatch.setitem(registry.get('lookup_laptop_catalog').func.__globals__, '_call_nestjs_tool', backend)
    result, _ = run_tool(registry, 'lookup_laptop_catalog', {})
    assert not result.is_error and '"total_matched": 0' in result.output


@pytest.mark.parametrize('name,args,payload', [
    ('get_product_details', {'sku': 'variant-1'}, {'id': 'variant-1', 'sku': 'ABC', 'name': 'A', 'priceVnd': '100'}),
    ('compare_products', {'skus': ['variant-1', 'DEF']}, {'total': 2, 'comparison': [
        {'id': 'variant-1', 'sku': 'ABC', 'name': 'A', 'priceVnd': '100'},
        {'id': 'variant-2', 'sku': 'DEF', 'name': 'B', 'priceVnd': '200'}]}),
])
def test_confirmed_variant_ids_match_core_products(registry, monkeypatch, name, args, payload):
    async def backend(*unused, **kwargs): return payload
    monkeypatch.setitem(registry.get(name).func.__globals__, '_call_nestjs_tool', backend)
    result, _ = run_tool(registry, name, args)
    assert not result.is_error


@pytest.mark.parametrize('name,args,payload', [
    ('lookup_laptop_catalog', {}, {'count': 1, 'laptops': [{'sku': 'ABC', 'name': 'A', 'price_vnd': 1.5}]}),
    ('lookup_laptop_catalog', {}, {'count': 0, 'laptops': [{'sku': 'ABC', 'name': 'A', 'price_vnd': '100'}]}),
    ('get_product_details', {'sku': 'ABC'}, {'sku': 'OTHER', 'name': 'A', 'priceVnd': '100'}),
    ('compare_products', {'skus': ['ABC', 'DEF']}, {'total': 1, 'comparison': [{'sku': 'ABC', 'name': 'A', 'priceVnd': '100'}]}),
    ('manage_favorite', {'sku': 'ABC', 'action': 'add'}, {'status': 'success', 'customer_id': 'other', 'sku': 'ABC', 'action': 'add', 'is_favorited': True}),
    ('manage_favorite', {'sku': 'ABC', 'action': 'add'}, {'status': 'success', 'customer_id': 'alice', 'sku': 'ABC', 'action': 'add', 'is_favorited': 'true'}),
])
def test_inconsistent_core_data_is_rejected(registry, monkeypatch, name, args, payload):
    async def backend(*unused, **kwargs): return payload
    monkeypatch.setitem(registry.get(name).func.__globals__, '_call_nestjs_tool', backend)
    result, executor = run_tool(registry, name, args)
    assert result.is_error and result.error_code == 'unavailable'
    assert not executor.idempotency._store
