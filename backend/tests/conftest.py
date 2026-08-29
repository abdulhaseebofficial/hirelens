"""Test fixtures: an isolated in-memory database and an authenticated client."""

from __future__ import annotations

import os

# Must be set before app.core.config is imported anywhere.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production-use-only")
os.environ.setdefault("GOOGLE_API_KEY", "AIzaTestKeyForUnitTestsOnly1234567890")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

from collections.abc import AsyncIterator  # noqa: E402

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.db.session import SessionFactory, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402

TEST_EMAIL = "recruiter@example.com"
TEST_PASSWORD = "Str0ngPassphrase!"


@pytest.fixture(autouse=True)
async def _fresh_schema() -> AsyncIterator[None]:
    """Rebuild the schema around every test so cases cannot leak into each other."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client


@pytest.fixture
async def db():
    async with SessionFactory() as session:
        yield session


@pytest.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    """A client with a registered user's access token already attached."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "full_name": "Test Recruiter"},
    )
    assert response.status_code == 201, response.text
    token = response.json()["tokens"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
