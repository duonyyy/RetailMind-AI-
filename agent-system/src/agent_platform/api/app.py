import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.harness import AgentHarness
from agent_platform.harness.guards.pii import PIIMasker
from agent_platform.harness.persistence.ports import (
    PersistenceError,
    sanitize_persistence_error,
)
from agent_platform.api.routers import chat, hitl, tools, health, web_client
from agent_platform.request_credentials import RequestCredentialMiddleware

logger = logging.getLogger("agent_platform.api")

def create_app(settings: PlatformSettings, pack: DomainPack) -> FastAPI:
    """
    Factory creating fully configured, hardened FastAPI enterprise application.
    """
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        try:
            yield
        finally:
            harness_obj = getattr(application.state, "harness", None)
            if harness_obj and hasattr(harness_obj, "aclose"):
                await harness_obj.aclose()

    app = FastAPI(
        title=f"{settings.app.name} — {pack.name}",
        version=settings.app.version,
        docs_url="/docs" if settings.app.env != "prod" else None,
        redoc_url="/redoc" if settings.app.env != "prod" else None,
        lifespan=lifespan,
    )

    # 1. State attachment
    app.state.settings = settings
    app.state.pack = pack
    app.state.harness = AgentHarness(settings=settings, pack=pack)
    app.add_middleware(RequestCredentialMiddleware)

    # 2. CORS Hardening (Fixes A6: never wildcard with credentials)
    origins = settings.app.cors_origins
    allow_creds = False if "*" in origins else True
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_creds,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # 3. Persistence Failure Handler (Fail-closed 503 without leaking DSN/PII)
    @app.exception_handler(PersistenceError)
    async def persistence_exception_handler(
        request: Request, exc: PersistenceError
    ) -> JSONResponse:
        correlation_id = f"corr_{uuid.uuid4().hex[:10]}"
        safe_exc = sanitize_persistence_error(exc)
        logger.error(
            "Durable persistence error [correlation_id=%s]: %s",
            correlation_id,
            safe_exc,
        )
        return JSONResponse(
            status_code=503,
            content={
                "error": "PersistenceUnavailable",
                "detail": "Durable persistence store unavailable; request was not committed.",
                "code": "PERSISTENCE_UNAVAILABLE",
                "correlation_id": correlation_id,
            },
        )

    # 4. Global Exception Handler (Mask internal error details & PII)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        correlation_id = f"corr_{uuid.uuid4().hex[:10]}"
        safe_exc = sanitize_persistence_error(exc)
        logger.error("Unhandled platform error [correlation_id=%s]: %s", correlation_id, safe_exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred while processing the agent request.",
                "code": "INTERNAL_SERVER_ERROR",
                "correlation_id": correlation_id,
            },
        )

    # 4. Include Routers
    app.include_router(chat.router)
    app.include_router(hitl.router)
    app.include_router(tools.router)
    app.include_router(health.router)
    app.include_router(web_client.router)

    return app


def get_default_app() -> FastAPI:
    from pathlib import Path
    from agent_platform.config.loader import load_settings
    settings = load_settings()
    domain_name = settings.app.domain or "retail_store"
    base_dir = Path(__file__).resolve().parents[3]
    domain_dir = base_dir / "domains" / domain_name
    if not domain_dir.exists():
        domain_dir = base_dir / "domains" / "retail_store"
    if not domain_dir.exists():
        raise FileNotFoundError(f"Domain pack directory not found: {domain_dir}")
    pack = DomainPack.load_from_dir(domain_dir)
    return create_app(settings=settings, pack=pack)


app = get_default_app()
