"""Sinalytix API — FastAPI application entry point.

Sinalytix does not diagnose, recommend treatment, or suggest dosages.
Clinical decisions belong solely to licensed healthcare professionals.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth as auth_router
from app.routers import calls as calls_router
from app.routers import caregiver as caregiver_router
from app.routers import family as family_router
from app.routers import health as health_router
from app.routers import messaging as messaging_router
from app.routers import notifications as notifications_router
from app.routers import shifts as shifts_router
from app.routers import sina as sina_router
from app.routers import tasks as tasks_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown events."""
    logger.info("sinalytix_api_starting", environment=settings.environment)
    yield
    logger.info("sinalytix_api_shutting_down")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ─────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(tasks_router.router)
app.include_router(calls_router.router)
app.include_router(messaging_router.router)
app.include_router(notifications_router.router)
app.include_router(health_router.router)
app.include_router(sina_router.router)
# Caregiver app
app.include_router(caregiver_router.router)
app.include_router(shifts_router.router)
# Family app
app.include_router(family_router.router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Basic health check endpoint."""
    return {"status": "healthy", "version": settings.app_version}


@app.get("/api/v1/health", tags=["system"])
async def api_health_check() -> dict[str, str]:
    """API versioned health check."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
    }
