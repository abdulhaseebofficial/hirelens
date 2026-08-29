"""Password hashing and JWT issuing/validation."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]

# bcrypt silently truncates beyond 72 bytes; hash a rejected-length password
# rather than letting a long passphrase collide with its own prefix.
_BCRYPT_MAX_BYTES = 72


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired, or of the wrong type."""


@dataclass(frozen=True)
class TokenPayload:
    subject: str
    token_type: TokenType
    jti: str
    expires_at: datetime


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > _BCRYPT_MAX_BYTES:
        raise ValueError("Password is too long (max 72 bytes).")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Check a plaintext password against a stored bcrypt hash."""
    try:
        password_bytes = password.encode("utf-8")
        if len(password_bytes) > _BCRYPT_MAX_BYTES:
            return False
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _create_token(
    subject: str, token_type: TokenType, ttl: timedelta
) -> tuple[str, TokenPayload]:
    now = datetime.now(UTC)
    expires_at = now + ttl
    jti = uuid.uuid4().hex
    claims: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(claims, settings.secret_key, algorithm=settings.jwt_algorithm)
    payload = TokenPayload(
        subject=subject, token_type=token_type, jti=jti, expires_at=expires_at
    )
    return token, payload


def create_access_token(subject: str) -> tuple[str, TokenPayload]:
    return _create_token(subject, "access", timedelta(minutes=settings.access_token_ttl_minutes))


def create_refresh_token(subject: str) -> tuple[str, TokenPayload]:
    return _create_token(subject, "refresh", timedelta(days=settings.refresh_token_ttl_days))


def decode_token(token: str, expected_type: TokenType) -> TokenPayload:
    """Decode and validate a JWT, enforcing that it is the token type we expect.

    Enforcing the type is what stops a long-lived refresh token from being
    replayed as an access token against protected endpoints.
    """
    try:
        claims = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise TokenError("Token has expired.") from exc
    except jwt.PyJWTError as exc:
        raise TokenError("Token is invalid.") from exc

    subject = claims.get("sub")
    token_type = claims.get("type")
    jti = claims.get("jti")
    exp = claims.get("exp")

    if not subject or not jti or exp is None:
        raise TokenError("Token is missing required claims.")
    if token_type != expected_type:
        raise TokenError(f"Expected a {expected_type} token.")

    return TokenPayload(
        subject=str(subject),
        token_type=expected_type,
        jti=str(jti),
        expires_at=datetime.fromtimestamp(int(exp), tz=UTC),
    )
