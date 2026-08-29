"""Pydantic request/response schemas."""

from app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisDetail,
    AnalysisSummary,
    CandidateDetail,
    CandidateSnapshot,
    CandidateSummary,
    EducationEntry,
    Page,
)
from app.schemas.auth import (
    AuthResponse,
    MessageResponse,
    RefreshRequest,
    TokenPair,
    UserCreate,
    UserLogin,
    UserRead,
)

__all__ = [
    "AnalysisCreateResponse",
    "AnalysisDetail",
    "AnalysisSummary",
    "AuthResponse",
    "CandidateDetail",
    "CandidateSnapshot",
    "CandidateSummary",
    "EducationEntry",
    "MessageResponse",
    "Page",
    "RefreshRequest",
    "TokenPair",
    "UserCreate",
    "UserLogin",
    "UserRead",
]
