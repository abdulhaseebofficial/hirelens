/**
 * Mirrors the Pydantic schemas in backend/app/schemas.
 * Keep this file in sync when the API contract changes — the backend's
 * /openapi.json is the source of truth.
 */

export type AnalysisStatus = "pending" | "running" | "completed" | "failed";
export type CandidateStatus = "pending" | "completed" | "failed";
export type FitTier = "high" | "mid" | "low";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface EducationEntry {
  degree: string | null;
  institution: string | null;
  year: string | null;
}

export interface CandidateSnapshot {
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  summary: string | null;
  experience_years: string | null;
  current_role: string | null;
  current_company: string | null;
  skills: string[];
  tools_technologies: string[];
  education: EducationEntry[];
  key_achievements: string[];
  languages: string[];
}

export interface CandidateSummary {
  id: string;
  filename: string;
  status: CandidateStatus;
  error: string | null;
  score: number | null;
  tier: FitTier | null;
  verdict: string | null;
  display_name: string;
  current_role: string | null;
  current_company: string | null;
  email: string | null;
  skills: string[];
  has_interview_kit: boolean;
}

export interface CandidateDetail extends CandidateSummary {
  fit_markdown: string | null;
  snapshot: CandidateSnapshot | null;
  snapshot_raw: string | null;
  interview_kit: string | null;
  created_at: string;
}

export interface AnalysisSummary {
  id: string;
  title: string;
  status: AnalysisStatus;
  model: string;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  candidate_count: number;
  completed_count: number;
  top_score: number | null;
  progress: number;
}

export interface AnalysisDetail extends AnalysisSummary {
  job_description: string;
  candidates: CandidateSummary[];
}

export interface AnalysisCreateResponse {
  id: string;
  status: AnalysisStatus;
  candidate_count: number;
  message: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface PublicConfig {
  max_file_size_mb: number;
  max_batch_size: number;
  model: string;
  gemini_configured: boolean;
  password_min_length: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: Array<{ field: string; message: string; type: string }>;
  };
}
