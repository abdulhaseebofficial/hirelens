/** One function per API endpoint, so components never build URLs by hand. */

import { apiKeyStore, request, requestBlob } from "@/api/client";
import type {
  AnalysisCreateResponse,
  AnalysisDetail,
  AnalysisStatus,
  AnalysisSummary,
  AuthResponse,
  CandidateDetail,
  Page,
  PublicConfig,
  TokenPair,
  User,
} from "@/types";

export const auth = {
  register: (email: string, password: string, fullName?: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      anonymous: true,
      body: { email, password, full_name: fullName || null },
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      anonymous: true,
      body: { email, password },
    }),

  refresh: (refreshToken: string) =>
    request<TokenPair>("/auth/refresh", {
      method: "POST",
      anonymous: true,
      body: { refresh_token: refreshToken },
    }),

  logout: (refreshToken: string) =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
      body: { refresh_token: refreshToken },
    }),

  me: () => request<User>("/auth/me"),
};

export const analyses = {
  create: (jobDescription: string, files: File[], title?: string, apiKey?: string) => {
    const form = new FormData();
    form.append("job_description", jobDescription);
    if (title?.trim()) form.append("title", title.trim());
    const keyToSend = apiKey?.trim() || apiKeyStore.key;
    if (keyToSend) form.append("api_key", keyToSend);
    for (const file of files) form.append("files", file, file.name);

    return request<AnalysisCreateResponse>("/analyses", { method: "POST", body: form });
  },

  verifyKey: (apiKey: string) =>
    request<{ valid: boolean; message: string }>("/analyses/verify-key", {
      method: "POST",
      body: { api_key: apiKey },
    }),

  list: (params: { limit?: number; offset?: number; status?: AnalysisStatus; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.offset !== undefined) query.set("offset", String(params.offset));
    if (params.status) query.set("status", params.status);
    if (params.search?.trim()) query.set("search", params.search.trim());

    const suffix = query.toString();
    return request<Page<AnalysisSummary>>(`/analyses${suffix ? `?${suffix}` : ""}`);
  },

  get: (id: string, signal?: AbortSignal) =>
    request<AnalysisDetail>(`/analyses/${id}`, { signal }),

  remove: (id: string) => request<void>(`/analyses/${id}`, { method: "DELETE" }),

  exportCsv: (id: string) => requestBlob(`/analyses/${id}/export.csv`, "candidate-ranking.csv"),

  candidate: (analysisId: string, candidateId: string) =>
    request<CandidateDetail>(`/analyses/${analysisId}/candidates/${candidateId}`),

  candidateCsv: (analysisId: string, candidateId: string) =>
    requestBlob(
      `/analyses/${analysisId}/candidates/${candidateId}/export.csv`,
      "candidate-profile.csv",
    ),

  interviewKit: (analysisId: string, candidateId: string, regenerate = false) =>
    request<CandidateDetail>(
      `/analyses/${analysisId}/candidates/${candidateId}/interview-kit${
        regenerate ? "?regenerate=true" : ""
      }`,
      { method: "POST" },
    ),
};

export const system = {
  config: () => request<PublicConfig>("/config"),
  health: () => request<{ status: string }>("/health"),
};
