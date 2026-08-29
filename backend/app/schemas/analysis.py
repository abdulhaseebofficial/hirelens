"""Analysis and candidate contracts."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.analysis import AnalysisStatus, CandidateStatus, FitTier

T = TypeVar("T")


class EducationEntry(BaseModel):
    degree: str | None = None
    institution: str | None = None
    year: str | None = None


class CandidateSnapshot(BaseModel):
    """Structured profile extracted from a CV. Every field is optional because
    the model only reports what the CV actually contains."""

    model_config = ConfigDict(extra="allow")

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    linkedin: str | None = None
    summary: str | None = None
    experience_years: str | None = None
    current_role: str | None = None
    current_company: str | None = None
    skills: list[str] = Field(default_factory=list)
    tools_technologies: list[str] = Field(default_factory=list)
    education: list[EducationEntry] = Field(default_factory=list)
    key_achievements: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)


class CandidateSummary(BaseModel):
    """Row-level view used by the ranking table."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    status: CandidateStatus
    error: str | None = None
    score: int | None = None
    tier: FitTier | None = None
    verdict: str | None = None
    display_name: str
    current_role: str | None = None
    current_company: str | None = None
    email: str | None = None
    skills: list[str] = Field(default_factory=list)
    has_interview_kit: bool = False


class CandidateDetail(CandidateSummary):
    """Full report for one candidate."""

    fit_markdown: str | None = None
    snapshot: dict[str, Any] | None = None
    snapshot_raw: str | None = None
    interview_kit: str | None = None
    created_at: datetime


class AnalysisSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    status: AnalysisStatus
    model: str
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    candidate_count: int = 0
    completed_count: int = 0
    top_score: int | None = None

    @computed_field
    @property
    def progress(self) -> float:
        """0.0-1.0 completion, for the frontend progress bar."""
        if self.candidate_count == 0:
            return 0.0
        return round(self.completed_count / self.candidate_count, 4)


class AnalysisDetail(AnalysisSummary):
    job_description: str
    candidates: list[CandidateSummary] = Field(default_factory=list)


class AnalysisCreateResponse(BaseModel):
    id: str
    status: AnalysisStatus
    candidate_count: int
    message: str


class Page(BaseModel, Generic[T]):
    """Offset-paginated envelope."""

    items: list[T]
    total: int
    limit: int
    offset: int

    @computed_field
    @property
    def has_more(self) -> bool:
        return self.offset + len(self.items) < self.total
