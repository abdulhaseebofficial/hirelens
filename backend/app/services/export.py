"""CSV exports for candidate profiles and rankings."""

from __future__ import annotations

import csv
import io

from app.models.analysis import Candidate

# Values Excel/Sheets would evaluate as a formula if left unquoted.
_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _safe(value: object) -> str:
    """Stringify a cell, neutralising CSV formula injection.

    CV content is attacker-controlled, so a field starting with '=' must not
    become a live formula when the recruiter opens the export.
    """
    if value is None:
        return ""
    text = str(value)
    if text.startswith(_FORMULA_PREFIXES):
        return "'" + text
    return text


def _join(values: object) -> str:
    if not isinstance(values, list):
        return ""
    return ", ".join(str(v) for v in values if v)


def candidate_csv(candidate: Candidate) -> str:
    """Single-candidate profile export."""
    snapshot = candidate.snapshot or {}
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(
        ["Name", "Email", "Phone", "LinkedIn", "Current Role", "Company", "Experience", "Skills"]
    )
    writer.writerow(
        [
            _safe(candidate.display_name),
            _safe(snapshot.get("email")),
            _safe(snapshot.get("phone")),
            _safe(snapshot.get("linkedin")),
            _safe(snapshot.get("current_role")),
            _safe(snapshot.get("current_company")),
            _safe(snapshot.get("experience_years")),
            _safe(_join(snapshot.get("skills"))),
        ]
    )
    return buffer.getvalue()


def ranking_csv(candidates: list[Candidate]) -> str:
    """Full ranked-batch export, in the order given."""
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "Rank",
            "Name",
            "Score",
            "Verdict",
            "Email",
            "Phone",
            "Current Role",
            "Company",
            "Experience",
            "Skills",
            "Status",
            "Source File",
        ]
    )
    for rank, candidate in enumerate(candidates, start=1):
        snapshot = candidate.snapshot or {}
        writer.writerow(
            [
                rank,
                _safe(candidate.display_name),
                candidate.score if candidate.score is not None else "",
                _safe(candidate.verdict),
                _safe(snapshot.get("email")),
                _safe(snapshot.get("phone")),
                _safe(snapshot.get("current_role")),
                _safe(snapshot.get("current_company")),
                _safe(snapshot.get("experience_years")),
                _safe(_join(snapshot.get("skills"))),
                candidate.status.value,
                _safe(candidate.filename),
            ]
        )
    return buffer.getvalue()
