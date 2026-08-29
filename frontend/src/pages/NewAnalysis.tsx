import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "@/api/client";
import { analyses, system } from "@/api/endpoints";
import { UploadZone } from "@/components/UploadZone";
import { Alert } from "@/components/ui";
import type { PublicConfig } from "@/types";

const MIN_JD_LENGTH = 50;

export function NewAnalysis() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    system
      .config()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const jdLength = jobDescription.trim().length;
  const jdTooShort = jdLength > 0 && jdLength < MIN_JD_LENGTH;
  const canSubmit = files.length > 0 && jdLength >= MIN_JD_LENGTH && !submitting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await analyses.create(jobDescription, files, title);
      navigate(`/analyses/${created.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the analysis.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="eyebrow">Step by step</p>
        <h1 className="text-2xl">New analysis</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Upload CVs and paste the job description. HireLens scores each candidate, extracts a
          structured profile, and ranks the batch.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {config && !config.gemini_configured && (
        <Alert tone="warning">
          The server has no Gemini API key configured, so analysis will be refused. Set
          <code className="mx-1 rounded bg-paper-sunken px-1.5 py-0.5">GOOGLE_API_KEY</code>
          in <code className="rounded bg-paper-sunken px-1.5 py-0.5">backend/.env</code> and restart
          it.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Both columns are flex columns so the upload zone can stretch to the
            height of the job-description box beside it. Left as blocks, the
            shorter column left a large hole under the drop target and pushed
            Step 3 far down the page. */}
        <section className="flex flex-col gap-3">
          <h2 className="section-label">Step 1 · Candidate CVs</h2>
          <div className="flex flex-1 flex-col">
            <UploadZone
              files={files}
              onChange={setFiles}
              maxFiles={config?.max_batch_size ?? 15}
              maxFileSizeMb={config?.max_file_size_mb ?? 10}
              disabled={submitting}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="section-label">Step 2 · Job description</h2>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            disabled={submitting}
            rows={12}
            className="input resize-y font-sans"
            placeholder={
              "Paste the full job description here.\n\nExample:\nWe are looking for a Software Engineer with 3+ years of Python experience…"
            }
            aria-describedby="jd-hint"
          />
          <p
            id="jd-hint"
            className={`text-xs ${jdTooShort ? "text-fit-low-light" : "text-ink-faint"}`}
          >
            {jdTooShort
              ? `At least ${MIN_JD_LENGTH} characters — currently ${jdLength}.`
              : "A complete JD, including requirements, gives noticeably better matching."}
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <label htmlFor="title" className="section-label block">
          Step 3 · Label this batch (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
          className="input max-w-md"
          placeholder="e.g. Senior Backend Engineer — Q3"
        />
      </section>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {submitting ? "Starting…" : `Analyze ${files.length || ""} CV${files.length === 1 ? "" : "s"}`.trim()}
        </button>
        <p className="text-xs text-ink-muted">
          {files.length === 0
            ? "Upload at least one CV to continue."
            : jdLength < MIN_JD_LENGTH
              ? "Paste a job description to continue."
              : `${files.length} CV${files.length === 1 ? "" : "s"} ready.`}
        </p>
      </div>
    </form>
  );
}
