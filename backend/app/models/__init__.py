"""SQLAlchemy models.

Every model must be imported here so that `Base.metadata` is fully populated
before Alembic autogenerate or `create_all` runs.
"""

from app.db.base import Base
from app.models.analysis import Analysis, AnalysisStatus, Candidate, CandidateStatus, FitTier
from app.models.user import RefreshToken, User

__all__ = [
    "Base",
    "Analysis",
    "AnalysisStatus",
    "Candidate",
    "CandidateStatus",
    "FitTier",
    "RefreshToken",
    "User",
]
