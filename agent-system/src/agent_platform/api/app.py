import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from agent_platform.config.settings import PlatformSettings
from agent_platform.domain.pack import DomainPack
from agent_platform.harness import AgentHarness
from agent_platform.api.routers import chat, hitl, tools, health, web_client

logger = logging.getLogger("agent_platform.api")

def create_app(settings: PlatformSettings, pack: DomainPack) -> FastAPI:
    """
    Factory creating fully configured, hardened FastAPI enterprise application.
    """
    app = FastAPI(
        title=f"{settings.app.name} — {pack.name}",
        version=settings.app.version,
        docs_url="/docs" if settings.app.env != "prod" else None,
        redoc_url="/redoc" if settings.app.env != "prod" else None,
    )

    # 1. State attachment
    app.state.settings = settings
    app.state.pack = pack
    app.state.harness = AgentHarness(settings=settings, pack=pack)

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

    # 3. Global Exception Handler (Fixes A9: mask internal stack traces)
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        correlation_id = f"corr_{uuid.uuid4().hex[:10]}"
        logger.error("Unhandled platform error [correlation_id=%s]: %s", correlation_id, exc, exc_info=True)
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

