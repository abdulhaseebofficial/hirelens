import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError } from "@/api/client";
import { analyses } from "@/api/endpoints";
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconSearch,
  IconTarget,
  IconTrash,
  IconUsers,
} from "@/components/icons";
import {
  Alert,
  CardSkeletonGrid,
  EmptyState,
  PageHeader,
  ProgressBar,
  StatTile,
  StatusChip,
} from "@/components/ui";
import type { AnalysisSummary, Page } from "@/types";

const PAGE_SIZE = 12;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function Dashboard() {
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

  // Summary across the page in view. The API paginates, so this is honestly
  // labelled as "on this page" rather than presented as an all-time total.
  const stats = useMemo(() => {
    const items = page?.items ?? [];
    const cvs = items.reduce((sum, item) => sum + item.candidate_count, 0);
    const scores = items.map((item) => item.top_score).filter((s): s is number => s !== null);
    const best = scores.length > 0 ? Math.max(...scores) : null;
    return { runs: page?.total ?? 0, cvs, best };
  }, [page]);

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

  const isEmpty = page && page.items.length === 0;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Screening history"
        title="Your analyses"
        description="Every batch you have run, with its ranking kept intact so you can revisit a shortlist later."
        actions={
          <Link to="/new" className="btn-primary">
            <IconPlus className="h-4 w-4" />
            New analysis
          </Link>
        }
      />

      {page && page.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile icon={IconTarget} label="Analyses" value={stats.runs} hint="All time" />
          <StatTile icon={IconUsers} label="CVs on this page" value={stats.cvs} />
          <StatTile
            icon={IconTarget}
            label="Best fit score"
            value={stats.best ?? "—"}
            hint={stats.best === null ? "No completed run yet" : "Across this page"}
          />
        </div>
      )}

      <label className="relative block max-w-sm">
        <span className="sr-only">Search analyses by title</span>
        <IconSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOffset(0);
          }}
          placeholder="Search by title…"
          className="input pl-10"
        />
      </label>

      {error && <Alert>{error}</Alert>}

      {loading && !page ? (
        <CardSkeletonGrid />
      ) : isEmpty ? (
        <EmptyState
          title={search ? "No matching analyses" : "No analyses yet"}
          description={
            search
              ? "Try a different search term, or clear the box to see everything."
              : "Upload a batch of CVs with a job description and HireLens will score, profile, and rank them."
          }
          action={
            !search && (
              <Link to="/new" className="btn-primary mt-2">
                <IconPlus className="h-4 w-4" />
                Run your first analysis
              </Link>
            )
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2">
            {page?.items.map((analysis, index) => {
              const running = analysis.status === "pending" || analysis.status === "running";
              return (
                <li
                  key={analysis.id}
                  className="card-interactive animate-rise group relative flex flex-col gap-4 p-5"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* Stretched link: the whole card is the target, while the
                          buttons below sit above it on the z-axis. */}
                      <Link
                        to={`/analyses/${analysis.id}`}
                        className="font-serif text-base font-semibold transition-colors before:absolute
                          before:inset-0 before:rounded-card before:content-[''] group-hover:text-coral-light"
                      >
                        {analysis.title}
                      </Link>
                      <span className="mt-1 block text-xs text-ink-faint">
                        {formatDate(analysis.created_at)}
                      </span>
                    </div>
                    <StatusChip status={analysis.status} />
                  </div>

                  {running ? (
                    <ProgressBar
                      value={analysis.progress}
                      label={`${analysis.completed_count} of ${analysis.candidate_count} analyzed`}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
                      <span className="inline-flex items-baseline gap-1.5">
                        <strong className="font-serif text-xl text-ink tabular-nums">
                          {analysis.candidate_count}
                        </strong>
                        CV{analysis.candidate_count === 1 ? "" : "s"}
                      </span>
                      {analysis.top_score !== null && (
                        <span className="inline-flex items-baseline gap-1.5">
                          Top score
                          <strong className="font-serif text-xl text-coral-light tabular-nums">
                            {analysis.top_score}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}

                  {analysis.error && (
                    <p className="text-xs text-fit-low-light">{analysis.error}</p>
                  )}

                  <div className="relative z-10 mt-auto flex items-center gap-2 pt-1">
                    <Link
                      to={`/analyses/${analysis.id}`}
                      className="btn-secondary py-1.5 text-xs"
                      tabIndex={-1}
                    >
                      Open
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(analysis)}
                      disabled={deletingId === analysis.id}
                      className="btn-danger-ghost ml-auto py-1.5 text-xs"
                      aria-label={`Delete ${analysis.title}`}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                      {deletingId === analysis.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {page && page.total > PAGE_SIZE && (
            <nav
              className="card flex items-center justify-between gap-4 px-4 py-3"
              aria-label="Pagination"
            >
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                <IconChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <span className="text-xs text-ink-muted tabular-nums">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} of {page.total}
              </span>
              <button
                type="button"
                className="btn-secondary py-1.5 text-xs"
                disabled={!page.has_more}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
