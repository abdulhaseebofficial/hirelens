"""Aggregates every v1 route under one router."""

from fastapi import APIRouter

from app.api.v1 import analyses, auth, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(analyses.router)
