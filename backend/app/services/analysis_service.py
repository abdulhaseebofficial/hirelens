"""Persistence and query logic for analyses and candidates."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import NotFoundError
from app.models.analysis import Analysis, AnalysisStatus, Candidate, CandidateStatus
from app.schemas.analysis import CandidateDetail, CandidateSummary


async def create_analysis(
    db: AsyncSession,
    *,
    user_id: str,
    title: str,
    job_description: str,
    model: str,
    uploads: list[tuple[str, str | None, str | None]],
) -> Analysis:
    """Create an analysis plus one candidate row per upload.

    `uploads` is a list of (filename, cv_text, error). Files that failed to
    parse are stored as FAILED candidates so the user sees why.
    """
    analysis = Analysis(
        user_id=user_id,
        title=title,
        job_description=job_description,
        model=model,
        status=AnalysisStatus.PENDING,
    )
    db.add(analysis)
    await db.flush()

    for filename, cv_text, error in uploads:
        db.add(
            Candidate(
                analysis_id=analysis.id,
                filename=filename,
                cv_text=cv_text,
                error=error,
                status=CandidateStatus.FAILED if error else CandidateStatus.PENDING,
            )
        )

    await db.commit()
    await db.refresh(analysis, attribute_names=["candidates"])
    return analysis


async def get_analysis(
    db: AsyncSession, analysis_id: str, user_id: str, *, with_candidates: bool = True
) -> Analysis:
    """Fetch one analysis owned by `user_id`, or raise NotFoundError.

    Scoping the query by owner (rather than checking after the fact) means a
    valid id belonging to another user is indistinguishable from a missing one.
    """
    stmt = select(Analysis).where(Analysis.id == analysis_id, Analysis.user_id == user_id)
    if with_candidates:
        stmt = stmt.options(selectinload(Analysis.candidates))

    analysis = (await db.execute(stmt)).scalar_one_or_none()
    if analysis is None:
        raise NotFoundError("Analysis not found.")
    return analysis


async def get_candidate(
    db: AsyncSession, analysis_id: str, candidate_id: str, user_id: str
) -> Candidate:
    stmt = (
        select(Candidate)
        .join(Analysis, Candidate.analysis_id == Analysis.id)
        .where(
            Candidate.id == candidate_id,
            Candidate.analysis_id == analysis_id,
            Analysis.user_id == user_id,
        )
    )
    candidate = (await db.execute(stmt)).scalar_one_or_none()
    if candidate is None:
        raise NotFoundError("Candidate not found.")
    return candidate


async def list_analyses(
    db: AsyncSession,
    user_id: str,
    *,
    limit: int = 20,
    offset: int = 0,
    status: AnalysisStatus | None = None,
    search: str | None = None,
) -> tuple[list[Analysis], int]:
    filters = [Analysis.user_id == user_id]
    if status is not None:
        filters.append(Analysis.status == status)
    if search:
        filters.append(Analysis.title.ilike(f"%{search.strip()}%"))

    total = (
        await db.execute(select(func.count()).select_from(Analysis).where(*filters))
    ).scalar_one()

    stmt = (
        select(Analysis)
        .where(*filters)
        .options(selectinload(Analysis.candidates))
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    analyses = list((await db.execute(stmt)).scalars().all())
    return analyses, total


async def delete_analysis(db: AsyncSession, analysis_id: str, user_id: str) -> None:
    analysis = await get_analysis(db, analysis_id, user_id, with_candidates=False)
    await db.delete(analysis)
    await db.commit()


def rank_candidates(candidates: list[Candidate]) -> list[Candidate]:
    """Highest score first; unscored and failed candidates sink to the bottom."""
    return sorted(
        candidates,
        key=lambda c: (
            c.status is CandidateStatus.COMPLETED,
            c.score if c.score is not None else -1,
        ),
        reverse=True,
    )


def to_candidate_summary(candidate: Candidate) -> CandidateSummary:
    snapshot = candidate.snapshot or {}
    return CandidateSummary(
        id=candidate.id,
        filename=candidate.filename,
        status=candidate.status,
        error=candidate.error,
        score=candidate.score,
        tier=candidate.tier,
        verdict=candidate.verdict,
        display_name=candidate.display_name,
        current_role=snapshot.get("current_role"),
        current_company=snapshot.get("current_company"),
        email=snapshot.get("email"),
        skills=snapshot.get("skills") or [],
        has_interview_kit=bool(candidate.interview_kit),
    )


def to_candidate_detail(candidate: Candidate) -> CandidateDetail:
    summary = to_candidate_summary(candidate)
    return CandidateDetail(
        **summary.model_dump(),
        fit_markdown=candidate.fit_markdown,
        snapshot=candidate.snapshot,
        snapshot_raw=candidate.snapshot_raw,
        interview_kit=candidate.interview_kit,
        created_at=candidate.created_at,
    )


def top_score(analysis: Analysis) -> int | None:
    scores = [c.score for c in analysis.candidates if c.score is not None]
    return max(scores) if scores else None
