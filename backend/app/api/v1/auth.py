"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.auth import (
    AuthResponse,
    MessageResponse,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserLogin,
    UserRead,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, request: Request, db: DbSession) -> AuthResponse:
    """Create an account and sign in immediately."""
    user = await auth_service.register_user(
        db,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
    )
    tokens = await auth_service.issue_tokens(
        db, user, user_agent=request.headers.get("user-agent")
    )
    return AuthResponse(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, request: Request, db: DbSession) -> AuthResponse:
    """Exchange email and password for an access/refresh token pair."""
    user = await auth_service.authenticate(db, email=payload.email, password=payload.password)
    tokens = await auth_service.issue_tokens(
        db, user, user_agent=request.headers.get("user-agent")
    )
    return AuthResponse(user=UserRead.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, request: Request, db: DbSession) -> TokenPair:
    """Rotate a refresh token into a fresh pair. The old token is revoked."""
    _, tokens = await auth_service.rotate_refresh_token(
        db, payload.refresh_token, user_agent=request.headers.get("user-agent")
    )
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: RefreshRequest, db: DbSession) -> MessageResponse:
    """Revoke a refresh token. Always succeeds, even for an unknown token."""
    await auth_service.revoke_refresh_token(db, payload.refresh_token)
    return MessageResponse(message="Signed out.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(user: CurrentUser, db: DbSession) -> MessageResponse:
    """Revoke every refresh token for the current account."""
    count = await auth_service.revoke_all_for_user(db, user.id)
    return MessageResponse(message=f"Signed out of {count} session(s).")


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    """Return the signed-in account."""
    return UserRead.model_validate(user)
