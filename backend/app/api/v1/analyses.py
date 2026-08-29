"""Analysis endpoints: create a batch, poll it, read results, export."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    Query,
    Response,
    UploadFile,
    status,
)

from app.api.deps import CurrentUser, DbSession, PageParams, enforce_analysis_rate_limit
from app.core.config import settings
from app.core.errors import ConflictError, ValidationError
from app.core.logging import get_logger
from app.models.analysis import AnalysisStatus, CandidateStatus
from app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisDetail,
    AnalysisSummary,
    CandidateDetail,
    Page,
)
from app.services import analysis_service, export, gemini, parsing, prompts
from app.services.pdf import PdfExtractionError, extract_text, truncate
from app.workers import runner

logger = get_logger(__name__)

router = APIRouter(prefix="/analyses", tags=["analyses"])

_UNSAFE_FILENAME = re.compile(r'[\\/:*?"<>|\r\n]+')


def _safe_filename(name: str | None) -> str:
    """Strip path separators so an upload cannot smuggle a path into storage."""
    cleaned = _UNSAFE_FILENAME.sub("_", (name or "").strip()) or "upload.pdf"
    return cleaned[-200:]


def _summary(analysis) -> AnalysisSummary:
    return AnalysisSummary(
        id=analysis.id,
        title=analysis.title,
        status=analysis.status,
        model=analysis.model,
        error=analysis.error,
        created_at=analysis.created_at,
        started_at=analysis.started_at,
        completed_at=analysis.completed_at,
        candidate_count=len(analysis.candidates),
        completed_count=analysis.completed_count,
        top_score=analysis_service.top_score(analysis),
    )


def _detail(analysis) -> AnalysisDetail:
    ranked = analysis_service.rank_candidates(analysis.candidates)
    return AnalysisDetail(
        **_summary(analysis).model_dump(exclude={"progress"}),
        job_description=analysis.job_description,
        candidates=[analysis_service.to_candidate_summary(c) for c in ranked],
    )


@router.post(
    "",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(enforce_analysis_rate_limit)],
)
async def create_analysis(
    user: CurrentUser,
    db: DbSession,
    background: BackgroundTasks,
    job_description: Annotated[str, Form(description="Full job description text")],
    files: Annotated[list[UploadFile], File(description="One or more CV PDFs")],
    title: Annotated[str | None, Form(description="Label for this batch")] = None,
) -> AnalysisCreateResponse:
    """Upload CVs against a job description and start the analysis.

    Returns 202 immediately; poll GET /analyses/{id} for progress.
    """
    if not gemini_available():
        raise ConflictError(
            f"The analysis service is not configured. {gemini.API_KEY_HELP}",
            code="gemini_not_configured",
        )

    jd = (job_description or "").strip()
    if len(jd) < 50:
        raise ValidationError("The job description is too short to produce a useful match.")

    if not files:
        raise ValidationError("Upload at least one CV.")
    if len(files) > settings.max_batch_size:
        raise ValidationError(f"Too many files — the limit is {settings.max_batch_size} per batch.")

    uploads: list[tuple[str, str | None, str | None]] = []
    for upload in files:
        filename = _safe_filename(upload.filename)
        data = await upload.read()
        await upload.close()

        if len(data) > settings.max_file_size_bytes:
            uploads.append((filename, None, f"File is larger than {settings.max_file_size_mb} MB."))
            continue

        try:
            uploads.append((filename, extract_text(data, filename), None))
        except PdfExtractionError as exc:
            uploads.append((filename, None, exc.message))

    if all(error for _, _, error in uploads):
        raise ValidationError(
            "None of the uploaded files could be read: "
            + "; ".join(f"{name} ({error})" for name, _, error in uploads)
        )

    analysis = await analysis_service.create_analysis(
        db,
        user_id=user.id,
        title=(title or "").strip() or _default_title(uploads),
        job_description=jd,
        model=settings.gemini_model,
        uploads=uploads,
    )

    background.add_task(runner.run_analysis, analysis.id)
    logger.info("Queued analysis %s with %d file(s)", analysis.id, len(uploads))

    return AnalysisCreateResponse(
        id=analysis.id,
        status=analysis.status,
        candidate_count=len(uploads),
        message="Analysis queued. Poll this analysis for progress.",
    )


def gemini_available() -> bool:
    return settings.gemini_configured


def _default_title(uploads: list[tuple[str, str | None, str | None]]) -> str:
    if len(uploads) == 1:
        return uploads[0][0].rsplit(".", 1)[0][:200]
    return f"Batch of {len(uploads)} CVs"


@router.get("", response_model=Page[AnalysisSummary])
async def list_analyses(
    user: CurrentUser,
    db: DbSession,
    page: PageParams,
    status_filter: Annotated[AnalysisStatus | None, Query(alias="status")] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> Page[AnalysisSummary]:
    """Paginated history of this account's analyses, newest first."""
    analyses, total = await analysis_service.list_analyses(
        db,
        user.id,
        limit=page.limit,
        offset=page.offset,
        status=status_filter,
        search=search,
    )
    return Page[AnalysisSummary](
        items=[_summary(a) for a in analyses],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{analysis_id}", response_model=AnalysisDetail)
async def get_analysis(analysis_id: str, user: CurrentUser, db: DbSession) -> AnalysisDetail:
    """One analysis with its ranked candidate list. Poll this for progress."""
    analysis = await analysis_service.get_analysis(db, analysis_id, user.id)
    return _detail(analysis)


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(analysis_id: str, user: CurrentUser, db: DbSession) -> Response:
    """Permanently delete an analysis and every candidate in it."""
    await analysis_service.delete_analysis(db, analysis_id, user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{analysis_id}/export.csv", response_class=Response)
async def export_ranking(analysis_id: str, user: CurrentUser, db: DbSession) -> Response:
    """Download the ranked batch as CSV."""
    analysis = await analysis_service.get_analysis(db, analysis_id, user.id)
    ranked = analysis_service.rank_candidates(analysis.candidates)
    filename = _safe_filename(f"{analysis.title}-ranking.csv")
    return Response(
        content=export.ranking_csv(ranked),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{analysis_id}/candidates/{candidate_id}", response_model=CandidateDetail)
async def get_candidate(
    analysis_id: str, candidate_id: str, user: CurrentUser, db: DbSession
) -> CandidateDetail:
    """Full report for one candidate, including the fit-score markdown."""
    candidate = await analysis_service.get_candidate(db, analysis_id, candidate_id, user.id)
    return analysis_service.to_candidate_detail(candidate)


@router.get("/{analysis_id}/candidates/{candidate_id}/export.csv", response_class=Response)
async def export_candidate(
    analysis_id: str, candidate_id: str, user: CurrentUser, db: DbSession
) -> Response:
    """Download one candidate profile as CSV."""
    candidate = await analysis_service.get_candidate(db, analysis_id, candidate_id, user.id)
    filename = _safe_filename(f"{candidate.display_name}-profile.csv")
    return Response(
        content=export.candidate_csv(candidate),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/{analysis_id}/candidates/{candidate_id}/interview-kit",
    response_model=CandidateDetail,
    dependencies=[Depends(enforce_analysis_rate_limit)],
)
async def generate_interview_kit(
    analysis_id: str,
    candidate_id: str,
    user: CurrentUser,
    db: DbSession,
    regenerate: Annotated[bool, Query(description="Replace an existing kit")] = False,
) -> CandidateDetail:
    """Generate the interview kit on demand — it is the most expensive call,
    so it is not part of the batch run."""
    candidate = await analysis_service.get_candidate(db, analysis_id, candidate_id, user.id)

    if candidate.interview_kit and not regenerate:
        return analysis_service.to_candidate_detail(candidate)

    if candidate.status is not CandidateStatus.COMPLETED or not candidate.cv_text:
        raise ConflictError("This candidate has no analyzed CV to build a kit from.")

    analysis = await analysis_service.get_analysis(db, analysis_id, user.id, with_candidates=False)

    candidate.interview_kit = await gemini.generate(
        prompts.interview_kit_prompt(
            truncate(candidate.cv_text, settings.max_cv_chars),
            truncate(analysis.job_description, settings.max_jd_chars),
        ),
        purpose="interview-kit",
    )
    await db.commit()
    await db.refresh(candidate)

    return analysis_service.to_candidate_detail(candidate)


@router.get("/{analysis_id}/candidates/{candidate_id}/fit-body", response_model=dict)
async def get_fit_body(
    analysis_id: str, candidate_id: str, user: CurrentUser, db: DbSession
) -> dict:
    """Fit-score markdown with the score heading removed (the UI shows a badge)."""
    candidate = await analysis_service.get_candidate(db, analysis_id, candidate_id, user.id)
    return {"markdown": parsing.strip_score_heading(candidate.fit_markdown or "")}
