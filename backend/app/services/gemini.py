"""Async Gemini client with retry, timeout, and typed failures."""

from __future__ import annotations

import asyncio
import random
from functools import lru_cache

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.errors import ServiceUnavailableError, UpstreamError
from app.core.logging import get_logger

logger = get_logger(__name__)

API_KEY_HELP = (
    "Get a key at https://aistudio.google.com/app/apikey and set GOOGLE_API_KEY in backend/.env."
)

_TRANSIENT_MARKERS = (
    "429",
    "500",
    "502",
    "503",
    "504",
    "rate limit",
    "resource_exhausted",
    "unavailable",
    "deadline",
    "timeout",
    "internal error",
)

_INVALID_KEY_MARKERS = ("api_key_invalid", "api key not valid", "unauthenticated")
_FORBIDDEN_MARKERS = ("permission_denied", "403")


class GeminiUnavailableError(ServiceUnavailableError):
    code = "gemini_not_configured"


@lru_cache
def _get_client_for_key(api_key: str) -> genai.Client:
    try:
        return genai.Client(api_key=api_key)
    except Exception as exc:
        raise GeminiUnavailableError(f"Failed to initialise the Gemini client: {exc}") from exc


def get_client(api_key: str | None = None) -> genai.Client:
    """Build or retrieve a Gemini client. Uses provided key or settings.google_api_key."""
    key = (api_key or "").strip() or (settings.google_api_key if settings.gemini_configured else None)
    if not key:
        raise GeminiUnavailableError(f"Gemini API key is not configured. {API_KEY_HELP}")
    return _get_client_for_key(key)


def _classify(error: Exception) -> tuple[bool, str]:
    """Return (is_transient, user_facing_message) for an upstream error."""
    text = str(error).lower()
    if any(marker in text for marker in _INVALID_KEY_MARKERS):
        return False, f"Google rejected the API key. Please check your key at https://aistudio.google.com/app/apikey"
    if any(marker in text for marker in _FORBIDDEN_MARKERS):
        return False, (
            f"The API key cannot access {settings.gemini_model}. {API_KEY_HELP}"
        )
    if any(marker in text for marker in _TRANSIENT_MARKERS):
        return True, "The Gemini API is busy or rate-limited. Please retry shortly."
    return False, f"Gemini request failed: {error}"


async def generate(
    prompt: str, *, purpose: str = "generation", api_key: str | None = None
) -> str:
    """Send one prompt to Gemini and return the text response.

    Retries transient failures with exponential backoff plus jitter, so a batch
    of concurrent requests does not retry in lockstep.
    """
    client = get_client(api_key=api_key)
    contents = [types.Content(role="user", parts=[types.Part.from_text(text=prompt)])]

    last_message = "Gemini request failed."
    for attempt in range(settings.gemini_max_retries):
        try:
            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=settings.gemini_model,
                    contents=contents,
                ),
                timeout=settings.gemini_timeout_seconds,
            )
        except TimeoutError:
            last_message = "The Gemini API did not respond in time."
            transient = True
        except Exception as exc:
            transient, last_message = _classify(exc)
            if not transient:
                logger.warning("Gemini %s failed permanently: %s", purpose, exc)
                raise UpstreamError(last_message) from exc
        else:
            text = (response.text or "").strip()
            if text:
                return text
            last_message = "Gemini returned an empty response."
            transient = True

        if attempt < settings.gemini_max_retries - 1:
            backoff = (2**attempt) + random.uniform(0, 0.5)
            logger.info(
                "Gemini %s attempt %d/%d failed (%s); retrying in %.1fs",
                purpose,
                attempt + 1,
                settings.gemini_max_retries,
                last_message,
                backoff,
            )
            await asyncio.sleep(backoff)

    raise UpstreamError(last_message)


async def verify_api_key(api_key: str) -> tuple[bool, str]:
    """Test whether a Gemini API key is valid and can generate content."""
    key = (api_key or "").strip()
    if not key:
        return False, "API key cannot be empty."
    try:
        client = get_client(api_key=key)
        await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_model,
                contents="Hello",
            ),
            timeout=10,
        )
        return True, "API key is valid and connected successfully!"
    except Exception as exc:
        _, user_msg = _classify(exc)
        return False, user_msg
