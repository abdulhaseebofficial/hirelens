"""Analysis runs and their per-candidate results."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class AnalysisStatus(enum.StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CandidateStatus(enum.StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class FitTier(enum.StrEnum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"


class Analysis(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One batch run: a job description matched against one or more CVs."""

    __tablename__ = "analyses"
    __table_args__ = (Index("ix_analyses_owner_created", "user_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, native_enum=False, length=20),
        default=AnalysisStatus.PENDING,
        nullable=False,
        index=True,
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped[User] = relationship(back_populates="analyses")
    candidates: Mapped[list[Candidate]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Candidate.created_at",
    )

    @property
    def candidate_count(self) -> int:
        return len(self.candidates)

    @property
    def completed_count(self) -> int:
        return sum(1 for c in self.candidates if c.status is CandidateStatus.COMPLETED)


class Candidate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One CV inside an analysis, with its score, profile, and interview kit."""

    __tablename__ = "candidates"
    __table_args__ = (Index("ix_candidates_analysis_score", "analysis_id", "score"),)

    analysis_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(400), nullable=False)
    status: Mapped[CandidateStatus] = mapped_column(
        Enum(CandidateStatus, native_enum=False, length=20),
        default=CandidateStatus.PENDING,
        nullable=False,
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    cv_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tier: Mapped[FitTier | None] = mapped_column(
        Enum(FitTier, native_enum=False, length=10), nullable=True
    )
    verdict: Mapped[str | None] = mapped_column(String(40), nullable=True)
    fit_markdown: Mapped[str | None] = mapped_column(Text, nullable=True)
    snapshot: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    snapshot_raw: Mapped[str | None] = mapped_column(Text, nullable=True)
    interview_kit: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis: Mapped[Analysis] = relationship(back_populates="candidates")

    @property
    def display_name(self) -> str:
        """Parsed candidate name, falling back to the uploaded filename."""
        snapshot = self.snapshot or {}
        name = snapshot.get("name")
        if isinstance(name, str):
            cleaned = name.strip()
            if cleaned and cleaned.lower() not in ("n/a", "null", "none"):
                return cleaned
        return self.filename
