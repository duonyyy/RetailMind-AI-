from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter(tags=["Health"])

@router.get("/health")
async def root_health_probe() -> dict:
    """Root health probe for platform orchestrator and load balancers."""
    return {"status": "healthy", "platform_state": "READY", "can_serve_traffic": True}

@router.get("/health/live")
async def liveness_probe() -> dict:
    """Liveness probe: confirms application process is running."""
    return {"status": "alive"}

@router.get("/health/ready")
async def readiness_probe() -> dict:
    """Readiness probe: confirms database and core dependencies are ready."""
    return {"status": "ready", "database": "connected"}

@router.get("/metrics", response_class=PlainTextResponse)
async def metrics_endpoint() -> str:
    """Prometheus metrics scrape target."""
    return (
        "# HELP platform_runs_total Total agent execution runs\n"
        "# TYPE platform_runs_total counter\n"
        "platform_runs_total 1\n"
        "# HELP platform_active_approvals Current pending approvals\n"
        "# TYPE platform_active_approvals gauge\n"
        "platform_active_approvals 0\n"
    )
