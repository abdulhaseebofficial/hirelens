"""Background execution of an analysis batch.

Runs after the HTTP response is returned, opening its own DB session because
the request-scoped one is already closed by then. Candidates are processed
concurrently under a semaphore so a 15-CV batch does not take 15x one CV.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import SessionFactory
from app.models.analysis import Analysis, AnalysisStatus, Candidate, CandidateStatus
from app.services import gemini, parsing, prompts
from app.services.pdf import truncate

logger = get_logger(__name__)


async def run_analysis(analysis_id: str, api_key: str | None = None) -> None:
    """Entry point for BackgroundTasks. Never raises into the caller."""
    try:
        async with SessionFactory() as db:
            await _execute(db, analysis_id, api_key=api_key)
    except Exception as exc:  # a crash here must not take the server down
        logger.exception("Analysis %s crashed: %s", analysis_id, exc)
        await _mark_failed(analysis_id, str(exc))


async def _execute(db: AsyncSession, analysis_id: str, api_key: str | None = None) -> None:
    analysis = (
        await db.execute(
            select(Analysis)
            .where(Analysis.id == analysis_id)
            .options(selectinload(Analysis.candidates))
        )
    ).scalar_one_or_none()

    if analysis is None:
        logger.warning("Analysis %s disappeared before it could run.", analysis_id)
        return

    pending = [c for c in analysis.candidates if c.status is CandidateStatus.PENDING]
    analysis.status = AnalysisStatus.RUNNING
    analysis.started_at = datetime.now(UTC)
    await db.commit()

    if not pending:
        await _finalize(db, analysis)
        return

    jd_text = truncate(analysis.job_description, settings.max_jd_chars)
    semaphore = asyncio.Semaphore(max(1, settings.analysis_concurrency))

    results = await asyncio.gather(
        *(_process_candidate(candidate, jd_text, semaphore, api_key=api_key) for candidate in pending),
        return_exceptions=True,
    )

    for candidate, result in zip(pending, results, strict=True):
        if isinstance(result, BaseException):
            logger.exception("Candidate %s failed: %s", candidate.id, result)
            candidate.status = CandidateStatus.FAILED
            candidate.error = str(result)
        else:
            _apply(candidate, result)

    await _finalize(db, analysis)


async def _process_candidate(
    candidate: Candidate, jd_text: str, semaphore: asyncio.Semaphore, api_key: str | None = None
) -> dict:
    """Run fit score + snapshot for one CV. Pure — the caller writes to the DB."""
    async with semaphore:
        cv_text = truncate(candidate.cv_text or "", settings.max_cv_chars)
        if not cv_text:
            raise ValueError("No CV text was extracted from this file.")

        # Both calls are independent, so overlap them.
        fit_markdown, snapshot_raw = await asyncio.gather(
            gemini.generate(prompts.fit_score_prompt(cv_text, jd_text), purpose="fit-score", api_key=api_key),
            gemini.generate(prompts.snapshot_prompt(cv_text), purpose="snapshot", api_key=api_key),
        )

        parsed, _ = parsing.parse_json_object(snapshot_raw)
        score = parsing.extract_score(fit_markdown)

        return {
            "fit_markdown": fit_markdown,
            "snapshot_raw": snapshot_raw,
            "snapshot": parsing.normalize_snapshot(parsed),
            "score": score,
            "tier": parsing.score_tier(score),
            "verdict": parsing.extract_verdict(fit_markdown),
        }


def _apply(candidate: Candidate, result: dict) -> None:
    candidate.fit_markdown = result["fit_markdown"]
    candidate.snapshot_raw = result["snapshot_raw"]
    candidate.snapshot = result["snapshot"]
    candidate.score = result["score"]
    candidate.tier = result["tier"]
    candidate.verdict = result["verdict"]
    candidate.status = CandidateStatus.COMPLETED
    candidate.error = None


async def _finalize(db: AsyncSession, analysis: Analysis) -> None:
    completed = sum(1 for c in analysis.candidates if c.status is CandidateStatus.COMPLETED)
    analysis.completed_at = datetime.now(UTC)

    if completed == 0:
        analysis.status = AnalysisStatus.FAILED
        analysis.error = "No CV in this batch could be analyzed."
    else:
        analysis.status = AnalysisStatus.COMPLETED
        analysis.error = None

    await db.commit()
    logger.info(
        "Analysis %s finished: %d/%d candidates completed.",
        analysis.id,
        completed,
        len(analysis.candidates),
    )


async def _mark_failed(analysis_id: str, message: str) -> None:
    """Best-effort status write after an unexpected crash."""
    try:
        async with SessionFactory() as db:
            analysis = await db.get(Analysis, analysis_id)
            if analysis is not None:
                analysis.status = AnalysisStatus.FAILED
                analysis.error = message[:2000]
                analysis.completed_at = datetime.now(UTC)
                await db.commit()
    except Exception:
        logger.exception("Could not record failure for analysis %s", analysis_id)
