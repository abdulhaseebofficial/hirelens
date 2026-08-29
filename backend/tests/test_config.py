"""Unit tests for settings normalisation."""

from __future__ import annotations

import pytest

from app.core.config import Settings


class TestDatabaseUrl:
    @pytest.mark.parametrize(
        "given",
        ["postgres://user:pw@host:5432/hirelens", "postgresql://user:pw@host:5432/hirelens"],
    )
    def test_rewrites_managed_host_dsn_to_asyncpg(self, given: str):
        """Render, Railway and Heroku inject a sync DSN the async engine cannot use."""
        assert (
            Settings(database_url=given).database_url
            == "postgresql+asyncpg://user:pw@host:5432/hirelens"
        )

    def test_leaves_an_explicit_driver_alone(self):
        url = "postgresql+asyncpg://user:pw@host:5432/hirelens"
        assert Settings(database_url=url).database_url == url

    def test_leaves_sqlite_alone(self):
        url = "sqlite+aiosqlite:///./hirelens.db"
        assert Settings(database_url=url).database_url == url

    def test_strips_surrounding_whitespace(self):
        assert (
            Settings(database_url="  postgres://user:pw@host/db  ").database_url
            == "postgresql+asyncpg://user:pw@host/db"
        )

    def test_does_not_touch_a_password_containing_the_prefix(self):
        """Only the scheme is rewritten, never a match later in the string."""
        url = "postgresql+asyncpg://user:postgres://weird@host/db"
        assert Settings(database_url=url).database_url == url


class TestGoogleApiKey:
    @pytest.mark.parametrize(
        "given",
        ["", "your_api_key_here", "changeme", "dev_placeholder", "short"],
    )
    def test_placeholder_values_read_as_not_configured(self, given: str):
        settings = Settings(google_api_key=given)
        assert settings.google_api_key == ""
        assert settings.gemini_configured is False

    def test_a_real_looking_key_is_kept(self):
        key = "AIzaSyRealLookingKeyForTests1234567890"
        settings = Settings(google_api_key=key)
        assert settings.google_api_key == key
        assert settings.gemini_configured is True


class TestCorsOrigins:
    """CORS_ORIGINS arrives as a plain env var, which pydantic-settings would
    otherwise try to JSON-decode at the source before any validator runs."""

    def test_accepts_the_documented_comma_separated_form(self):
        assert Settings(cors_origins="https://a.vercel.app,https://b.vercel.app").cors_origins == [
            "https://a.vercel.app",
            "https://b.vercel.app",
        ]

    def test_accepts_a_single_origin(self):
        assert Settings(cors_origins="https://a.vercel.app").cors_origins == [
            "https://a.vercel.app"
        ]

    def test_trims_whitespace_and_drops_empties(self):
        assert Settings(cors_origins="  https://a.com , , https://b.com  ").cors_origins == [
            "https://a.com",
            "https://b.com",
        ]

    def test_still_accepts_a_json_array(self):
        assert Settings(cors_origins='["https://a.com", "https://b.com"]').cors_origins == [
            "https://a.com",
            "https://b.com",
        ]

    def test_a_list_passes_through(self):
        assert Settings(cors_origins=["https://a.com"]).cors_origins == ["https://a.com"]

    def test_malformed_json_is_reported_clearly(self):
        with pytest.raises(ValueError, match="not valid JSON"):
            Settings(cors_origins='["https://a.com"')
