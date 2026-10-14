import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, saveBlob } from "@/api/client";
import { analyses } from "@/api/endpoints";
import { CandidateTable } from "@/components/CandidateTable";
import {
  IconAlert,
  IconArrowLeft,
  IconChevronDown,
  IconDownload,
  IconSparkles,
  IconTarget,
  IconUsers,
} from "@/components/icons";
import { Alert, PageLoader, ProgressBar, StatTile, StatusChip } from "@/components/ui";
import { useAnalysis } from "@/hooks/useAnalysis";
import { CandidateReport } from "@/pages/CandidateReport";

/** Collapsible panel with a chevron that turns — used for the JD and failures. */
function Disclosure({
  summary,
  tone = "default",
  children,
}: {
  summary: string;
  tone?: "default" | "warning";
  children: React.ReactNode;
}) {
  return (
    <details className="card group overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-4 text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
        <IconChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
        {tone === "warning" && <IconAlert className="h-4 w-4 shrink-0 text-fit-mid-light" />}
        {summary}
      </summary>
      <div className="border-t border-line px-5 py-4">{children}</div>
    </details>
  );
}

export function AnalysisDetail() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const { analysis, loading, error, polling } = useAnalysis(analysisId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Default to the top-ranked candidate once results land, without fighting
  // a selection the user has already made.
  useEffect(() => {
    if (selectedId || !analysis) return;
    const firstCompleted = analysis.candidates.find((c) => c.status === "completed");
    if (firstCompleted) setSelectedId(firstCompleted.id);
  }, [analysis, selectedId]);

  const handleExport = async () => {
    if (!analysisId) return;
    try {
      const { blob, filename } = await analyses.exportCsv(analysisId);
      saveBlob(blob, filename);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : "Could not export the ranking.");
    }
  };

  if (loading && !analysis) return <PageLoader label="Loading analysis…" />;
  if (error) return <Alert>{error}</Alert>;
  if (!analysis) return null;

  const completed = analysis.candidates.filter((c) => c.status === "completed");
  const failed = analysis.candidates.filter((c) => c.status === "failed");
  const isBatch = analysis.candidates.length > 1;
  const topScore = completed.reduce<number | null>(
    (best, candidate) =>
      candidate.score !== null && (best === null || candidate.score > best) ? candidate.score : best,
    null,
  );

  return (
    <div className="space-y-7">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-coral-light"
      >
        <IconArrowLeft className="h-3.5 w-3.5" />
        All analyses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[1.7rem] leading-tight break-words">{analysis.title}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-ink-faint">
            <StatusChip status={analysis.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-sunken px-2.5 py-1 font-medium">
              <IconSparkles className="h-3.5 w-3.5" />
              {analysis.model}
            </span>
          </div>
        </div>

        {completed.length > 0 && (
          <button type="button" onClick={handleExport} className="btn-secondary">
            <IconDownload className="h-4 w-4" />
            Download ranking (CSV)
          </button>
        )}
      </div>

      {exportError && <Alert>{exportError}</Alert>}

      {polling ? (
        <div className="card animate-fade space-y-3 p-5">
          <ProgressBar
            value={analysis.progress}
            label={`Analyzing — ${analysis.completed_count} of ${analysis.candidate_count} done`}
          />
          <p className="text-xs leading-relaxed text-ink-muted">
            This page updates itself. Each CV needs a fit score and a profile extraction, so a large
            batch takes a little while.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile icon={IconUsers} label="CVs in batch" value={analysis.candidate_count} />
          <StatTile
            icon={IconTarget}
            label="Analyzed"
            value={completed.length}
            hint={failed.length > 0 ? `${failed.length} could not be read` : "All files processed"}
          />
          <StatTile icon={IconTarget} label="Top fit score" value={topScore ?? "—"} />
        </div>
      )}

      {analysis.status === "failed" && <Alert>{analysis.error ?? "This analysis failed."}</Alert>}

      {failed.length > 0 && (
        <Disclosure
          tone="warning"
          summary={`${failed.length} file${failed.length === 1 ? "" : "s"} could not be processed`}
        >
          <ul className="space-y-2 text-sm text-ink-muted">
            {failed.map((candidate) => (
              <li key={candidate.id}>
                <strong className="text-ink">{candidate.filename}</strong> — {candidate.error}
              </li>
            ))}
          </ul>
        </Disclosure>
      )}

      <Disclosure summary="Job description">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
          {analysis.job_description}
        </p>
      </Disclosure>

      {isBatch && completed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg">Ranking</h2>
            <p className="text-xs text-ink-faint">Select a row to read the full report</p>
          </div>
          <CandidateTable
            candidates={analysis.candidates}
            selectedId={selectedId}
            onSelect={(candidate) => {
              if (candidate.status === "completed") setSelectedId(candidate.id);
            }}
          />
        </section>
      )}

      {selectedId && analysisId && (
        <section className="space-y-3">
          {isBatch && <h2 className="text-lg">Full report</h2>}
          <CandidateReport analysisId={analysisId} candidateId={selectedId} />
        </section>
      )}

      {!polling && completed.length === 0 && (
        <Alert tone="warning">
          No candidate in this batch could be analyzed. Check the file errors above and try again.
        </Alert>
      )}
    </div>
  );
}
