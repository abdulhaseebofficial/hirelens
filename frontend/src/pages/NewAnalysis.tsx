import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, apiKeyStore } from "@/api/client";
import { analyses, system } from "@/api/endpoints";
import { ApiKeySection } from "@/components/ApiKeySection";
import { UploadZone } from "@/components/UploadZone";
import { IconCheck, IconSparkles } from "@/components/icons";
import { Alert, PageHeader } from "@/components/ui";
import type { PublicConfig } from "@/types";

const MIN_JD_LENGTH = 50;

/** Numbered step heading that ticks over to a checkmark once satisfied. */
function Step({
  index,
  title,
  hint,
  done,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold
            transition-colors duration-300 ${
              done
                ? "bg-fit-high text-white"
                : "border border-line-strong bg-paper-sunken text-ink-muted"
            }`}
          aria-hidden="true"
        >
          {done ? <IconCheck className="h-3.5 w-3.5" /> : index}
        </span>
        <h2 className="text-[0.7rem] font-bold tracking-[0.1em] text-ink uppercase">{title}</h2>
        {hint && <span className="text-xs text-ink-faint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function NewAnalysis() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [hasUserKey, setHasUserKey] = useState(() => Boolean(apiKeyStore.key));

  useEffect(() => {
    system
      .config()
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const jdLength = jobDescription.trim().length;
  const jdTooShort = jdLength > 0 && jdLength < MIN_JD_LENGTH;
  const jdReady = jdLength >= MIN_JD_LENGTH;
  const keyReady = Boolean(config?.gemini_configured || hasUserKey);
  const canSubmit = files.length > 0 && jdReady && keyReady && !submitting;

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
    <form onSubmit={handleSubmit} className="space-y-7">
      <PageHeader
        eyebrow="AI Screening"
        title="New analysis"
        description="Upload CVs and paste the job description. HireLens scores each candidate, extracts a structured profile, and ranks the batch using Google Gemini."
      />

      {error && <Alert>{error}</Alert>}

      <ApiKeySection
        serverConfigured={config?.gemini_configured}
        onKeyChange={(hasKey) => setHasUserKey(hasKey)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Both columns are flex columns so the upload zone can stretch to the
            height of the job-description box beside it. Left as blocks, the
            shorter column left a large hole under the drop target and pushed
            step 3 far down the page. */}
        <Step
          index={1}
          title="Candidate CVs"
          hint={files.length > 0 ? `${files.length} selected` : undefined}
          done={files.length > 0}
        >
          <div className="flex flex-1 flex-col">
            <UploadZone
              files={files}
              onChange={setFiles}
              maxFiles={config?.max_batch_size ?? 15}
              maxFileSizeMb={config?.max_file_size_mb ?? 10}
              disabled={submitting}
            />
          </div>
        </Step>

        <Step
          index={2}
          title="Job description"
          hint={jdLength > 0 ? `${jdLength} characters` : undefined}
          done={jdReady}
        >
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            disabled={submitting}
            rows={12}
            className="input flex-1 resize-y font-sans leading-relaxed"
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
        </Step>
      </div>

      <Step index={3} title="Label this batch" hint="Optional" done={title.trim().length > 0}>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={submitting}
          className="input max-w-md"
          placeholder="e.g. Senior Backend Engineer — Q3"
          aria-label="Batch label"
        />
      </Step>

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          <IconSparkles className="h-4 w-4" />
          {submitting
            ? "Starting…"
            : `Analyze ${files.length || ""} CV${files.length === 1 ? "" : "s"}`.trim()}
        </button>
        <p className="text-xs text-ink-muted">
          {!keyReady
            ? "Enter your Google Gemini API key above to continue."
            : files.length === 0
              ? "Upload at least one CV to continue."
              : !jdReady
                ? "Paste a job description to continue."
                : `${files.length} CV${files.length === 1 ? "" : "s"} ready — this usually takes under a minute per CV.`}
        </p>
      </div>
    </form>
  );
}
