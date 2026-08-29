"""Application settings, loaded from environment / .env and validated once at import."""

from __future__ import annotations

import secrets
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDER_HINTS = ("your_api_key", "your-api-key", "placeholder", "changeme", "xxxx")


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

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

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
        """Accept a comma-separated string so CORS_ORIGINS works as a plain env var."""
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return value
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @field_validator("database_url", mode="after")
    @classmethod
    def _use_async_driver(cls, value: str) -> str:
        """Managed hosts hand out sync DSNs; SQLAlchemy's async engine needs a driver.

        Render, Railway and Heroku all inject `postgres://` or `postgresql://`,
        which create_async_engine rejects. Rewrite those to asyncpg rather than
        making every deployment remember to.
        """
        cleaned = value.strip()
        for prefix in ("postgres://", "postgresql://"):
            if cleaned.startswith(prefix):
                return "postgresql+asyncpg://" + cleaned[len(prefix) :]
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
