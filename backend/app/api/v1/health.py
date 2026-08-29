"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Liveness: the process is up. Never touches dependencies."""
    return {
        "status": "ok",
        "service": settings.project_name,
        "environment": settings.environment,
    }


@router.get("/health/ready")
async def readiness(db: DbSession) -> dict:
    """Readiness: report each dependency so a failing probe says which one."""
    checks: dict[str, str] = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc}"

    checks["gemini"] = "configured" if settings.gemini_configured else "not_configured"

    ready = checks["database"] == "ok" and checks["gemini"] == "configured"
    return {
        "status": "ready" if ready else "degraded",
        "checks": checks,
        "model": settings.gemini_model,
    }


@router.get("/config")
async def public_config() -> dict:
    """Limits the frontend needs so it can validate before uploading."""
    return {
        "max_file_size_mb": settings.max_file_size_mb,
        "max_batch_size": settings.max_batch_size,
        "model": settings.gemini_model,
        "gemini_configured": settings.gemini_configured,
        "password_min_length": settings.password_min_length,
    }
