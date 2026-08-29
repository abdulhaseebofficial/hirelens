"""Turn free-form model output into structured, trustworthy values."""

from __future__ import annotations

import json
import re
from typing import Any

from app.models.analysis import FitTier

_NULLISH = {"n/a", "na", "null", "none", "not found", "unknown", "-", ""}

_SCORE_RE = re.compile(r"FIT\s*SCORE:\s*(\d{1,3})", re.IGNORECASE)
_VERDICT_RE = re.compile(r"\*\*\s*(Strong Fit|Moderate Fit|Weak Fit)", re.IGNORECASE)
_HEADING_RE = re.compile(r"^##\s*FIT SCORE:.*\n?", re.IGNORECASE)
_FENCE_OPEN_RE = re.compile(r"^```(?:json)?\s*")
_FENCE_CLOSE_RE = re.compile(r"\s*```$")


def clean_value(value: Any) -> str | None:
    """Normalise a model-provided scalar; nullish placeholders become None."""
    if value is None or isinstance(value, (dict, list)):
        return None
    text = str(value).strip()
    return None if text.lower() in _NULLISH else text


def clean_list(values: Any) -> list[str]:
    """Normalise a model-provided list into clean strings, dropping junk entries."""
    if not isinstance(values, list):
        return []
    cleaned = []
    for item in values:
        if isinstance(item, dict):
            # Occasionally the model returns [{"skill": "Python"}] instead of ["Python"].
            item = next((v for v in item.values() if isinstance(v, (str, int, float))), None)
        text = clean_value(item)
        if text:
            cleaned.append(text)
    return cleaned


def parse_json_object(raw: str) -> tuple[dict[str, Any] | None, str | None]:
    """Extract a JSON object from a model response.

    Returns (data, error). Handles code fences and stray prose around the object.
    """
    if not raw:
        return None, "Empty response."

    cleaned = _FENCE_CLOSE_RE.sub("", _FENCE_OPEN_RE.sub("", raw.strip())).strip()

    for candidate in (cleaned, _first_object(cleaned)):
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            return data, None
        if isinstance(data, list):
            first_dict = next((item for item in data if isinstance(item, dict)), None)
            if first_dict is not None:
                return first_dict, None

    return None, "No JSON object found in the response."


def _first_object(text: str) -> str | None:
    """Return the first balanced {...} block, ignoring braces inside strings."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    return None


def normalize_snapshot(data: dict[str, Any] | None) -> dict[str, Any] | None:
    """Coerce a parsed snapshot into the shape the frontend expects."""
    if not isinstance(data, dict):
        return None

    education: list[dict[str, str | None]] = []
    for entry in data.get("education") or []:
        if isinstance(entry, dict):
            education.append(
                {
                    "degree": clean_value(entry.get("degree")),
                    "institution": clean_value(entry.get("institution")),
                    "year": clean_value(entry.get("year")),
                }
            )
        else:
            text = clean_value(entry)
            if text:
                education.append({"degree": text, "institution": None, "year": None})

    return {
        "name": clean_value(data.get("name")),
        "email": clean_value(data.get("email")),
        "phone": clean_value(data.get("phone")),
        "linkedin": clean_value(data.get("linkedin")),
        "summary": clean_value(data.get("summary")),
        "experience_years": clean_value(data.get("experience_years")),
        "current_role": clean_value(data.get("current_role")),
        "current_company": clean_value(data.get("current_company")),
        "skills": clean_list(data.get("skills")),
        "tools_technologies": clean_list(data.get("tools_technologies")),
        "education": education,
        "key_achievements": clean_list(data.get("key_achievements")),
        "languages": clean_list(data.get("languages")),
    }


def extract_score(fit_markdown: str) -> int | None:
    """Pull the 0-100 score out of the fit-score markdown, clamped to range."""
    match = _SCORE_RE.search(fit_markdown or "")
    if not match:
        return None
    return max(0, min(100, int(match.group(1))))


def extract_verdict(fit_markdown: str) -> str | None:
    match = _VERDICT_RE.search(fit_markdown or "")
    return match.group(1).title() if match else None


def score_tier(score: int | None) -> FitTier:
    """Bucket a score for badge colouring."""
    if score is None:
        return FitTier.MID
    if score >= 75:
        return FitTier.HIGH
    if score >= 50:
        return FitTier.MID
    return FitTier.LOW


def strip_score_heading(fit_markdown: str) -> str:
    """Remove the '## FIT SCORE: n/100' line; the UI renders it as a badge."""
    return _HEADING_RE.sub("", fit_markdown or "").strip()
