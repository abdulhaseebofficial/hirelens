"""Async engine, session factory, and the FastAPI session dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")
_is_memory = ":memory:" in settings.database_url

_engine_kwargs: dict = {"echo": settings.db_echo, "future": True}
if _is_sqlite:
    # aiosqlite hands the connection between tasks; SQLAlchemy's async layer
    # already serialises access, so the thread check is safe to relax.
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    if _is_memory:
        _engine_kwargs["poolclass"] = StaticPool
else:
    _engine_kwargs.update(pool_size=10, max_overflow=20, pool_pre_ping=True)
    if "+asyncpg" in settings.database_url:
        # Managed Postgres is usually reached through a PgBouncer endpoint in
        # transaction mode, where a prepared statement cached on one connection
        # is invalid on the next. Disabling the cache keeps that safe.
        _engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(settings.database_url, **_engine_kwargs)

if _is_sqlite:

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record) -> None:
        """SQLite ignores foreign keys unless asked; WAL keeps reads unblocked."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        if not _is_memory:
            cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


SessionFactory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Request-scoped session. Rolls back if the handler raises."""
    async with SessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    await engine.dispose()
