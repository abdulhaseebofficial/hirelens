"""HireLens API — application factory and middleware."""

from __future__ import annotations

import time
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.deps import enforce_global_rate_limit
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger, request_id_ctx
from app.db.session import dispose_engine

configure_logging()
logger = get_logger(__name__)

DESCRIPTION = """
Recruiter-facing CV screening API.

* **Fit score** — evidence-based 0-100 match between a CV and a job description
* **Candidate snapshot** — structured profile extracted from the CV
* **Interview kit** — role-specific questions, generated on demand
* **Batch ranking** — upload up to the configured batch limit and rank them

Sign in with `POST /api/v1/auth/login`, then send `Authorization: Bearer <access_token>`.
"""


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting %s (env=%s, model=%s, gemini_configured=%s)",
        settings.project_name,
        settings.environment,
        settings.gemini_model,
        settings.gemini_configured,
    )
    if not settings.gemini_configured:
        logger.warning(
            "GOOGLE_API_KEY is not set to a usable value — analysis endpoints will refuse requests."
        )
    yield
    await dispose_engine()
    logger.info("Shutdown complete.")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        description=DESCRIPTION,
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        dependencies=[Depends(enforce_global_rate_limit)],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Content-Disposition", "X-Request-ID"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        """Tag every request with an id and log how long it took."""
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        token = request_id_ctx.set(request_id)
        started = time.perf_counter()
        try:
            response = await call_next(request)
            elapsed_ms = (time.perf_counter() - started) * 1000
            response.headers["X-Request-ID"] = request_id
            logger.info(
                "%s %s -> %s (%.1fms)",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
            return response
        finally:
            # Reset last, so the log line above still carries the request id.
            request_id_ctx.reset(token)

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        return {
            "service": settings.project_name,
            "version": app.version,
            "docs": "/docs",
            "api": settings.api_v1_prefix,
        }

    return app


app = create_app()
