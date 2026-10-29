"""Request-scoped bearer credential; never put it in LangGraph state or checkpoints."""
from contextvars import ContextVar

_authorization: ContextVar[str | None] = ContextVar('agent_request_authorization', default=None)


def current_authorization() -> str | None:
    return _authorization.get()


class RequestCredentialMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        headers = [v for k, v in scope.get('headers', []) if k.lower() == b'authorization']
        value = headers[0].decode('latin-1') if len(headers) == 1 else None
        token = _authorization.set(value)
        try:
            await self.app(scope, receive, send)
        finally:
            _authorization.reset(token)
