"""In-process sliding-window rate limiting.

Deliberately in-memory: it is per-worker, so a multi-process deployment should
move this behind Redis. For a single-node deployment it is enough to stop one
client from burning the Gemini quota.
"""

from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.errors import RateLimitError


class SlidingWindowLimiter:
    """Allows `limit` events per `window` seconds for each key."""

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str) -> None:
        """Record a hit for `key`, raising RateLimitError when over budget."""
        if not settings.rate_limit_enabled:
            return

        now = time.monotonic()
        async with self._lock:
            bucket = self._hits[key]
            cutoff = now - self.window
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= self.limit:
                retry_after = max(1, int(bucket[0] + self.window - now) + 1)
                raise RateLimitError(
                    f"Rate limit exceeded. Try again in {retry_after}s.",
                )

            bucket.append(now)

            # Opportunistic cleanup so idle keys do not accumulate forever.
            if len(self._hits) > 4096:
                for stale_key in [k for k, v in self._hits.items() if not v]:
                    del self._hits[stale_key]

    def reset(self) -> None:
        self._hits.clear()


global_limiter = SlidingWindowLimiter(
    settings.rate_limit_requests, settings.rate_limit_window_seconds
)
analysis_limiter = SlidingWindowLimiter(
    settings.analysis_rate_limit_requests, settings.analysis_rate_limit_window_seconds
)


def client_key(request: Request) -> str:
    """Prefer the authenticated user; fall back to the peer address."""
    user = getattr(request.state, "user_id", None)
    if user:
        return f"user:{user}"
    client = request.client
    return f"ip:{client.host}" if client else "ip:unknown"
