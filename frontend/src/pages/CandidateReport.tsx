import { useCallback, useEffect, useState } from "react";

import { ApiError, saveBlob } from "@/api/client";
import { analyses } from "@/api/endpoints";
import { Markdown } from "@/components/Markdown";
import { ScoreBadge, VerdictPill } from "@/components/ScoreBadge";
import { Alert, Field, PageLoader, SkillPills, Spinner } from "@/components/ui";
import type { CandidateDetail } from "@/types";

type TabId = "fit" | "profile" | "kit";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "fit", label: "Fit score & evidence" },
  { id: "profile", label: "Candidate snapshot" },
  { id: "kit", label: "Interview kit" },
];

/** Strip the '## FIT SCORE: n/100' heading — the badge already shows it. */
function withoutScoreHeading(markdown: string) {
  return markdown.replace(/^##\s*FIT SCORE:.*\n?/i, "").trim();
}

export function CandidateReport({
  analysisId,
  candidateId,
}: {
  analysisId: string;
  candidateId: string;
}) {
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("fit");
  const [generating, setGenerating] = useState(false);
  const [kitError, setKitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCandidate(await analyses.candidate(analysisId, candidateId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this candidate.");
    } finally {
      setLoading(false);
    }
  }, [analysisId, candidateId]);

  useEffect(() => {
    void load();
    setTab("fit");
    setKitError(null);
  }, [load]);

  const generateKit = async (regenerate = false) => {
    setGenerating(true);
    setKitError(null);
    try {
      setCandidate(await analyses.interviewKit(analysisId, candidateId, regenerate));
    } catch (err) {
      setKitError(
        err instanceof ApiError ? err.message : "Could not generate the interview kit.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadProfileCsv = async () => {
    try {
      const { blob, filename } = await analyses.candidateCsv(analysisId, candidateId);
      saveBlob(blob, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export this profile.");
    }
  };

  const downloadJson = () => {
    if (!candidate?.snapshot) return;
    const blob = new Blob([JSON.stringify(candidate.snapshot, null, 2)], {
      type: "application/json",
    });
    saveBlob(blob, `${candidate.display_name.replace(/[^\w -]/g, "_")}-profile.json`);
  };

  const downloadKit = () => {
    if (!candidate?.interview_kit) return;
    const blob = new Blob([candidate.interview_kit], { type: "text/markdown" });
    saveBlob(blob, `${candidate.display_name.replace(/[^\w -]/g, "_")}-interview-kit.md`);
  };

  if (loading) return <PageLoader label="Loading candidate report…" />;
  if (error) return <Alert>{error}</Alert>;
  if (!candidate) return null;

  if (candidate.status === "failed") {
    return (
      <Alert>
        <strong>{candidate.filename}</strong> could not be processed:{" "}
        {candidate.error ?? "unknown error"}
      </Alert>
    );
  }

  const snapshot = candidate.snapshot;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Candidate report" className="flex gap-1 border-b border-line">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`tab-${entry.id}`}
            aria-selected={tab === entry.id}
            aria-controls={`panel-${entry.id}`}
            onClick={() => setTab(entry.id)}
            className={`rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === entry.id
                ? "bg-coral/15 text-coral-light"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "fit" && (
        <section role="tabpanel" id="panel-fit" aria-labelledby="tab-fit" className="space-y-4">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-2.5">
              <ScoreBadge score={candidate.score} tier={candidate.tier} size="lg" />
              <VerdictPill verdict={candidate.verdict} tier={candidate.tier} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl">{candidate.display_name}</h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                {[snapshot?.current_role, snapshot?.current_company].filter(Boolean).join(" · ") ||
                  candidate.filename}
              </p>
            </div>
          </div>

          {candidate.fit_markdown ? (
            <div className="card p-5">
              <Markdown>{withoutScoreHeading(candidate.fit_markdown)}</Markdown>
            </div>
          ) : (
            <Alert tone="info">No fit analysis was produced for this candidate.</Alert>
          )}
        </section>
      )}

      {tab === "profile" && (
        <section
          role="tabpanel"
          id="panel-profile"
          aria-labelledby="tab-profile"
          className="space-y-4"
        >
          {snapshot ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="card p-5">
                  <h3 className="section-label mb-2">Contact</h3>
                  <Field label="Name" value={snapshot.name} />
                  <Field label="Email" value={snapshot.email} />
                  <Field label="Phone" value={snapshot.phone} />
                  <Field label="LinkedIn" value={snapshot.linkedin} />

                  <h3 className="section-label mt-5 mb-2">Current position</h3>
                  <Field label="Role" value={snapshot.current_role} />
                  <Field label="Company" value={snapshot.current_company} />
                  <Field
                    label="Experience"
                    value={snapshot.experience_years ? `${snapshot.experience_years} years` : null}
                  />
                </div>

                <div className="card space-y-4 p-5">
                  <div>
                    <h3 className="section-label mb-2">Skills</h3>
                    <SkillPills items={snapshot.skills} />
                  </div>
                  <div>
                    <h3 className="section-label mb-2">Tools &amp; technologies</h3>
                    <SkillPills items={snapshot.tools_technologies} />
                  </div>
                  <div>
                    <h3 className="section-label mb-2">Education</h3>
                    {snapshot.education.length > 0 ? (
                      <ul className="space-y-1 text-sm text-ink-muted">
                        {snapshot.education.map((entry, index) => (
                          <li key={`${entry.degree}-${index}`}>
                            {[entry.degree, entry.institution, entry.year]
                              .filter(Boolean)
                              .join(" · ")}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-ink-faint">Not listed</span>
                    )}
                  </div>
                </div>
              </div>

              {snapshot.summary && (
                <div className="card p-5">
                  <h3 className="section-label mb-2">Summary</h3>
                  <p className="text-sm leading-relaxed text-ink">{snapshot.summary}</p>
                </div>
              )}

              {snapshot.key_achievements.length > 0 && (
                <div className="card p-5">
                  <h3 className="section-label mb-2">Key achievements</h3>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink">
                    {snapshot.key_achievements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadJson} className="btn-secondary text-xs">
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={downloadProfileCsv}
                  className="btn-secondary text-xs"
                >
                  Download CSV
                </button>
              </div>
            </>
          ) : (
            <Alert tone="warning">
              The structured profile could not be parsed for this CV.
              {candidate.snapshot_raw && (
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-paper-sunken p-3 text-xs">
                  {candidate.snapshot_raw}
                </pre>
              )}
            </Alert>
          )}
        </section>
      )}

      {tab === "kit" && (
        <section role="tabpanel" id="panel-kit" aria-labelledby="tab-kit" className="space-y-4">
          {kitError && <Alert>{kitError}</Alert>}

          {candidate.interview_kit ? (
            <>
              <div className="card p-5">
                <Markdown>{candidate.interview_kit}</Markdown>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadKit} className="btn-secondary text-xs">
                  Download kit
                </button>
                <button
                  type="button"
                  onClick={() => generateKit(true)}
                  disabled={generating}
                  className="btn-ghost text-xs"
                >
                  {generating ? "Regenerating…" : "Regenerate"}
                </button>
              </div>
            </>
          ) : (
            <div className="card flex flex-col items-center gap-4 px-6 py-12 text-center">
              <h3 className="text-lg">Interview kit not generated yet</h3>
              <p className="max-w-md text-sm text-ink-muted">
                Six role-specific questions with answer rubrics, plus two clarification questions
                for the gaps found above. Generated on demand so batch runs stay cheap.
              </p>
              {generating ? (
                <Spinner label="Writing questions…" />
              ) : (
                <button type="button" onClick={() => generateKit()} className="btn-primary">
                  Generate interview kit
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
