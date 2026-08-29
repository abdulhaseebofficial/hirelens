"""Shared FastAPI dependencies: auth, pagination, rate limits."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AuthError
from app.core.rate_limit import analysis_limiter, client_key, global_limiter
from app.core.security import TokenError, decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False, description="JWT access token")

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    request: Request,
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)] = None,
) -> User:
    """Resolve the caller from the Bearer access token."""
    if credentials is None or not credentials.credentials:
        raise AuthError("Authentication required.")

    try:
        payload = decode_token(credentials.credentials, "access")
    except TokenError as exc:
        raise AuthError(str(exc)) from exc

    user = await db.get(User, payload.subject)
    if user is None or not user.is_active:
        raise AuthError("Account is no longer active.")

    # Lets the rate limiter key on the user rather than a shared NAT address.
    request.state.user_id = user.id
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def enforce_global_rate_limit(request: Request) -> None:
    await global_limiter.check(client_key(request))


async def enforce_analysis_rate_limit(request: Request, _: CurrentUser) -> None:
    """Stricter budget on the endpoint that actually spends Gemini quota."""
    await analysis_limiter.check(client_key(request))


class Pagination:
    def __init__(
        self,
        limit: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
        offset: Annotated[int, Query(ge=0, description="Items to skip")] = 0,
    ) -> None:
        self.limit = limit
        self.offset = offset


PageParams = Annotated[Pagination, Depends(Pagination)]
