"""Application settings, loaded from environment / .env and validated once at import."""

from __future__ import annotations

import json
import secrets
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PLACEHOLDER_HINTS = ("your_api_key", "your-api-key", "placeholder", "changeme", "xxxx")

# libpq understands these; asyncpg does not, and SQLAlchemy passes every query
# parameter straight through to asyncpg.connect().
LIBPQ_ONLY_PARAMS = frozenset(
    {
        "sslmode",
        "channel_binding",
        "sslrootcert",
        "sslcert",
        "sslkey",
        "gssencmode",
        "target_session_attrs",
        "connect_timeout",
    }
)


class Settings(BaseSettings):
    """Runtime configuration for the HireLens API."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # -- App -----------------------------------------------------------------
    project_name: str = "HireLens API"
    api_v1_prefix: str = "/api/v1"
    environment: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = False

    # -- Security ------------------------------------------------------------
    # Generated per-process when unset. That is fine for local dev but means
    # tokens die on restart, so production MUST set SECRET_KEY explicitly.
    secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(48))
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 14
    password_min_length: int = 10

    # NoDecode keeps pydantic-settings from JSON-decoding this at the source, which
    # happens before validators run and rejects the documented comma-separated form.
    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # -- Database ------------------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./hirelens.db"
    db_echo: bool = False

    # -- Gemini --------------------------------------------------------------
    google_api_key: str = ""
    gemini_model: str = "models/gemini-flash-lite-latest"
    gemini_max_retries: int = 3
    gemini_timeout_seconds: float = 90.0

    # -- Analysis limits -----------------------------------------------------
    max_file_size_mb: int = 10
    max_batch_size: int = 15
    max_cv_chars: int = 30_000
    max_jd_chars: int = 15_000
    analysis_concurrency: int = 4

    # -- Rate limiting -------------------------------------------------------
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60
    analysis_rate_limit_requests: int = 10
    analysis_rate_limit_window_seconds: int = 300

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        """Accept a comma-separated string so CORS_ORIGINS works as a plain env var.

        NoDecode on the field means nothing has parsed this yet, so a JSON array
        has to be handled here too.
        """
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    return json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"CORS_ORIGINS is not valid JSON: {exc}") from exc
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("database_url", mode="after")
    @classmethod
    def _use_async_driver(cls, value: str) -> str:
        """Turn a managed host's DSN into one asyncpg can actually open.

        Render, Railway, Heroku and Neon all inject a sync `postgres://` or
        `postgresql://` URL, which create_async_engine rejects outright. They
        also append libpq-only query parameters — Neon sends
        `?sslmode=require&channel_binding=require` — and SQLAlchemy forwards
        every query parameter to asyncpg.connect(), which does not accept them:

            TypeError: connect() got an unexpected keyword argument 'channel_binding'

        So rewrite the scheme and drop those parameters. TLS still happens:
        asyncpg negotiates it, and these providers require it server-side.
        """
        cleaned = value.strip()
        for prefix in ("postgres://", "postgresql://"):
            if cleaned.startswith(prefix):
                cleaned = "postgresql+asyncpg://" + cleaned[len(prefix) :]
                break

        if "+asyncpg://" in cleaned and "?" in cleaned:
            base, _, query = cleaned.partition("?")
            kept = [
                part
                for part in query.split("&")
                if part and part.split("=", 1)[0].lower() not in LIBPQ_ONLY_PARAMS
            ]
            cleaned = f"{base}?{'&'.join(kept)}" if kept else base

        return cleaned

    @field_validator("google_api_key", mode="after")
    @classmethod
    def _reject_placeholder_key(cls, value: str) -> str:
        """Treat obvious placeholder values as 'not configured' rather than a real key."""
        cleaned = value.strip().strip('"').strip("'")
        if not cleaned:
            return ""
        lowered = cleaned.lower()
        if len(cleaned) < 20 or any(hint in lowered for hint in PLACEHOLDER_HINTS):
            return ""
        return cleaned

    @property
    def gemini_configured(self) -> bool:
        return bool(self.google_api_key)

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Cached settings accessor — import this rather than constructing Settings()."""
    return Settings()


settings = get_settings()
