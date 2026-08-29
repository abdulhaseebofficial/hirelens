"""Registration, login, and refresh-token lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import AuthError, ConflictError
from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.base import as_utc
from app.models.user import RefreshToken, User
from app.schemas.auth import TokenPair


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    stmt = select(User).where(User.email == normalize_email(email))
    return (await db.execute(stmt)).scalar_one_or_none()


async def register_user(
    db: AsyncSession, *, email: str, password: str, full_name: str | None
) -> User:
    email = normalize_email(email)
    if await get_user_by_email(db, email):
        raise ConflictError("An account with this email already exists.")

    user = User(email=email, full_name=full_name, hashed_password=hash_password(password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        # Two concurrent registrations can both pass the check above.
        await db.rollback()
        raise ConflictError("An account with this email already exists.") from exc
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, *, email: str, password: str) -> User:
    user = await get_user_by_email(db, email)

    # Hash even when the user is missing, so response time does not reveal
    # whether an email is registered.
    password_hash = user.hashed_password if user else hash_password("timing-equalizer-value")
    valid = verify_password(password, password_hash)

    if not user or not valid:
        raise AuthError("Incorrect email or password.")
    if not user.is_active:
        raise AuthError("This account has been deactivated.")

    user.last_login_at = datetime.now(UTC)
    await db.commit()
    return user


async def issue_tokens(db: AsyncSession, user: User, *, user_agent: str | None = None) -> TokenPair:
    """Mint an access/refresh pair and record the refresh jti for revocation."""
    access_token, _ = create_access_token(user.id)
    refresh_token, refresh_payload = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            jti=refresh_payload.jti,
            user_id=user.id,
            expires_at=refresh_payload.expires_at,
            user_agent=(user_agent or "")[:400] or None,
        )
    )
    await db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_ttl_minutes * 60,
    )


async def rotate_refresh_token(
    db: AsyncSession, token: str, *, user_agent: str | None = None
) -> tuple[User, TokenPair]:
    """Exchange a refresh token for a new pair, revoking the one presented.

    Rotation means a stolen token is only usable until the legitimate client
    refreshes next.
    """
    try:
        payload = decode_token(token, "refresh")
    except TokenError as exc:
        raise AuthError(str(exc)) from exc

    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.jti == payload.jti))
    ).scalar_one_or_none()

    if stored is None:
        raise AuthError("Refresh token is not recognised.")
    if stored.is_revoked:
        raise AuthError("Refresh token has already been used or revoked.")
    if as_utc(stored.expires_at) <= datetime.now(UTC):
        raise AuthError("Refresh token has expired.")

    user = await db.get(User, payload.subject)
    if user is None or not user.is_active:
        raise AuthError("Account is no longer active.")

    stored.revoked_at = datetime.now(UTC)
    await db.commit()

    return user, await issue_tokens(db, user, user_agent=user_agent)


async def revoke_refresh_token(db: AsyncSession, token: str) -> None:
    """Best-effort logout: an unparseable token is simply a no-op."""
    try:
        payload = decode_token(token, "refresh")
    except TokenError:
        return

    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.jti == payload.jti))
    ).scalar_one_or_none()

    if stored is not None and not stored.is_revoked:
        stored.revoked_at = datetime.now(UTC)
        await db.commit()


async def revoke_all_for_user(db: AsyncSession, user_id: str) -> int:
    """Revoke every active refresh token for a user (log out everywhere)."""
    stmt = select(RefreshToken).where(
        RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None)
    )
    tokens = list((await db.execute(stmt)).scalars().all())
    now = datetime.now(UTC)
    for token in tokens:
        token.revoked_at = now
    await db.commit()
    return len(tokens)
