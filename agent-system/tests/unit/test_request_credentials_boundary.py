import asyncio
from pathlib import Path

import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from agent_platform.request_credentials import RequestCredentialMiddleware, current_authorization


def test_context_is_request_scoped_for_streams_and_not_in_principal():
    app = FastAPI()
    app.add_middleware(RequestCredentialMiddleware)

    @app.get('/stream')
    async def stream():
        async def events():
            await asyncio.sleep(0)
            yield current_authorization() or 'none'
        return StreamingResponse(events())

    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as client:
            a, b, guest = await asyncio.gather(
                client.get('/stream', headers={'Authorization': 'Bearer alice-test'}),
                client.get('/stream', headers={'Authorization': 'Bearer bob-test'}),
                client.get('/stream'),
            )
        assert [a.text, b.text, guest.text] == ['Bearer alice-test', 'Bearer bob-test', 'none']
        assert current_authorization() is None
    asyncio.run(run())


def test_customer_tool_forwards_request_token_without_customer_header(monkeypatch):
    from agent_platform.harness.state.principal import Principal
    from agent_platform.harness.tools.registry import ToolRegistry
    from agent_platform.harness.tools.spec import ToolContext
    registry = ToolRegistry()
    registry.load_from_module_file(Path('domains/retail_store/tools.py'))
    module = registry.get('view_cart').func.__globals__
    module['_NESTJS_OFFLINE_UNTIL'] = 0
    calls = []

    class FakeClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, json, headers):
            calls.append(headers)
            return httpx.Response(200, json={'data': {'subtotal_vnd': '0', 'items': []}})

    monkeypatch.setattr(httpx, 'AsyncClient', FakeClient)
    ctx = ToolContext(principal=Principal(user_id='alice', role='customer'), idempotency_key='test', thread_id='t', run_id='r')
    assert 'authorization' not in ctx.principal.model_dump()

    async def run():
        call = module['_call_nestjs_tool']
        assert await call('view_cart', {}, ctx) is None
        assert not calls
        from agent_platform import request_credentials
        token = request_credentials._authorization.set('Bearer test-token')
        try:
            assert await call('view_cart', {}, ctx) == {'subtotal_vnd': '0', 'items': []}
        finally:
            request_credentials._authorization.reset(token)
        assert calls[0]['Authorization'] == 'Bearer test-token'
        assert 'X-Customer-Id' not in calls[0]
    asyncio.run(run())
