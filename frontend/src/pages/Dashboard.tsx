import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { analyses } from "@/api/endpoints";
import { Alert, EmptyState, PageLoader, ProgressBar, StatusChip } from "@/components/ui";
import type { AnalysisSummary, Page } from "@/types";

const PAGE_SIZE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState<Page<AnalysisSummary> | null>(null);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPage(await analyses.list({ limit: PAGE_SIZE, offset, search }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your analyses.");
    } finally {
      setLoading(false);
    }
  }, [offset, search]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep polling only while something in view is still running.
  const hasActiveRun = page?.items.some(
    (item) => item.status === "pending" || item.status === "running",
  );

  useEffect(() => {
    if (!hasActiveRun) return;
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [hasActiveRun, load]);

  const handleDelete = async (analysis: AnalysisSummary) => {
    if (!window.confirm(`Delete "${analysis.title}" and all of its candidates?`)) return;
    setDeletingId(analysis.id);
    try {
      await analyses.remove(analysis.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this analysis.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Screening history</p>
          <h1 className="text-2xl">Your analyses</h1>
        </div>
        <Link to="/new" className="btn-primary">
          New analysis
        </Link>
      </div>

      <label className="block">
        <span className="sr-only">Search analyses by title</span>
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOffset(0);
          }}
          placeholder="Search by title…"
          className="input max-w-sm"
        />
      </label>

      {error && <Alert>{error}</Alert>}

      {loading && !page ? (
        <PageLoader label="Loading your analyses…" />
      ) : page && page.items.length === 0 ? (
        <EmptyState
          title={search ? "No matching analyses" : "No analyses yet"}
          description={
            search
              ? "Try a different search term."
              : "Upload a batch of CVs with a job description and HireLens will score, profile, and rank them."
          }
          action={
            !search && (
              <Link to="/new" className="btn-primary mt-2">
                Run your first analysis
              </Link>
            )
          }
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {page?.items.map((analysis) => {
              const running = analysis.status === "pending" || analysis.status === "running";
              return (
                <li key={analysis.id} className="card flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/analyses/${analysis.id}`)}
                      className="text-left"
                    >
                      <span className="font-serif text-base font-semibold hover:text-coral-light">
                        {analysis.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {formatDate(analysis.created_at)}
                      </span>
                    </button>
                    <StatusChip status={analysis.status} />
                  </div>

                  {running ? (
                    <ProgressBar
                      value={analysis.progress}
                      label={`${analysis.completed_count} of ${analysis.candidate_count} analyzed`}
                    />
                  ) : (
                    <div className="flex items-baseline gap-4 text-sm text-ink-muted">
                      <span>
                        <strong className="font-serif text-lg text-ink">
                          {analysis.candidate_count}
                        </strong>{" "}
                        CV{analysis.candidate_count === 1 ? "" : "s"}
                      </span>
                      {analysis.top_score !== null && (
                        <span>
                          Top score{" "}
                          <strong className="font-serif text-lg text-coral-light">
                            {analysis.top_score}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {analysis.error && (
                    <p className="text-xs text-fit-low-light">{analysis.error}</p>
                  )}

                  <div className="mt-auto flex gap-2 pt-1">
                    <Link to={`/analyses/${analysis.id}`} className="btn-secondary py-1.5 text-xs">
                      Open
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(analysis)}
                      disabled={deletingId === analysis.id}
                      className="btn-ghost py-1.5 text-xs hover:text-fit-low-light"
                    >
                      {deletingId === analysis.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {page && page.total > PAGE_SIZE && (
            <nav className="flex items-center justify-between gap-4" aria-label="Pagination">
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <span className="text-xs text-ink-muted">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} of {page.total}
              </span>
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                disabled={!page.has_more}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
