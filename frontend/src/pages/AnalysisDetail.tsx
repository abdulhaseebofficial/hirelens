import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, saveBlob } from "@/api/client";
import { analyses } from "@/api/endpoints";
import { CandidateTable } from "@/components/CandidateTable";
import { Alert, PageLoader, ProgressBar, StatusChip } from "@/components/ui";
import { useAnalysis } from "@/hooks/useAnalysis";
import { CandidateReport } from "@/pages/CandidateReport";

export function AnalysisDetail() {
  const { analysisId } = useParams<{ analysisId: string }>();
  const { analysis, loading, error, polling } = useAnalysis(analysisId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [jdOpen, setJdOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/" className="eyebrow hover:underline">
            ← All analyses
          </Link>
          <h1 className="mt-1 truncate text-2xl">{analysis.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
            <StatusChip status={analysis.status} />
            <span>{analysis.candidate_count} CVs</span>
            <span>{analysis.model}</span>
          </div>
        </div>

        {completed.length > 0 && (
          <button type="button" onClick={handleExport} className="btn-secondary">
            Download ranking (CSV)
          </button>
        )}
      </div>

      {exportError && <Alert>{exportError}</Alert>}

      {polling && (
        <div className="card space-y-3 p-5">
          <ProgressBar
            value={analysis.progress}
            label={`Analyzing — ${analysis.completed_count} of ${analysis.candidate_count} done`}
          />
          <p className="text-xs text-ink-muted">
            This page updates itself. Each CV needs a fit score and a profile extraction, so a
            large batch takes a little while.
          </p>
        </div>
      )}

      {analysis.status === "failed" && (
        <Alert>{analysis.error ?? "This analysis failed."}</Alert>
      )}

      {failed.length > 0 && (
        <details className="card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
            {failed.length} file{failed.length === 1 ? "" : "s"} could not be processed
          </summary>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
            {failed.map((candidate) => (
              <li key={candidate.id}>
                <strong className="text-ink">{candidate.filename}</strong> — {candidate.error}
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="card p-4" open={jdOpen} onToggle={(e) => setJdOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-semibold text-ink-muted">
          Job description
        </summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
          {analysis.job_description}
        </p>
      </details>

      {isBatch && completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg">Ranking</h2>
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
