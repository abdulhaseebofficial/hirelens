import { useCallback, useEffect, useState } from "react";

import { ApiError, saveBlob } from "@/api/client";
import { analyses } from "@/api/endpoints";
import { Markdown } from "@/components/Markdown";
import { ScoreBadge, VerdictPill } from "@/components/ScoreBadge";
import {
  IconAward,
  IconBriefcase,
  IconClipboard,
  IconDownload,
  IconGraduation,
  IconLinkedin,
  IconMail,
  IconRefresh,
  IconTarget,
  IconUsers,
} from "@/components/icons";
import {
  Alert,
  Field,
  PageLoader,
  SegmentedTabs,
  SkillPills,
  Spinner,
} from "@/components/ui";
import type { CandidateDetail } from "@/types";

type TabId = "fit" | "profile" | "kit";

const TABS = [
  { id: "fit" as const, label: "Fit & evidence", icon: IconTarget },
  { id: "profile" as const, label: "Snapshot", icon: IconUsers },
  { id: "kit" as const, label: "Interview kit", icon: IconClipboard },
];

/** Strip the '## FIT SCORE: n/100' heading — the badge already shows it. */
function withoutScoreHeading(markdown: string) {
  return markdown.replace(/^##\s*FIT SCORE:.*\n?/i, "").trim();
}

/** Card with an icon'd heading, used throughout the snapshot tab. */
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-coral-light" />
        <span className="section-label">{title}</span>
      </h3>
      {children}
    </div>
  );
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
      setKitError(err instanceof ApiError ? err.message : "Could not generate the interview kit.");
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
      {/* Candidate header — carried across all three tabs so the score never
          scrolls out of reach while reading the evidence. */}
      <div className="card flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
        <div className="flex flex-col items-center gap-2.5">
          <ScoreBadge score={candidate.score} tier={candidate.tier} size="lg" />
          <VerdictPill verdict={candidate.verdict} tier={candidate.tier} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-2xl break-words">{candidate.display_name}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {[snapshot?.current_role, snapshot?.current_company].filter(Boolean).join(" · ") ||
              candidate.filename}
          </p>
          {snapshot && snapshot.skills.length > 0 && (
            <div className="mt-3.5 flex justify-center sm:justify-start">
              <SkillPills items={snapshot.skills} max={6} />
            </div>
          )}
        </div>
      </div>

      <SegmentedTabs
        tabs={TABS}
        active={tab}
        onChange={setTab}
        idPrefix="candidate"
        label="Candidate report"
      />

      {tab === "fit" && (
        <section
          role="tabpanel"
          id="candidate-panel-fit"
          aria-labelledby="candidate-tab-fit"
          className="animate-fade"
        >
          {candidate.fit_markdown ? (
            <div className="card p-5 sm:p-6">
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
          id="candidate-panel-profile"
          aria-labelledby="candidate-tab-profile"
          className="animate-fade space-y-4"
        >
          {snapshot ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Panel title="Contact" icon={IconMail}>
                  <Field label="Name" value={snapshot.name} />
                  <Field label="Email" value={snapshot.email} icon={IconMail} />
                  <Field label="Phone" value={snapshot.phone} />
                  <Field label="LinkedIn" value={snapshot.linkedin} icon={IconLinkedin} />
                </Panel>

                <Panel title="Current position" icon={IconBriefcase}>
                  <Field label="Role" value={snapshot.current_role} />
                  <Field label="Company" value={snapshot.current_company} />
                  <Field
                    label="Experience"
                    value={snapshot.experience_years ? `${snapshot.experience_years} years` : null}
                  />
                  <Field
                    label="Languages"
                    value={snapshot.languages.length > 0 ? snapshot.languages.join(", ") : null}
                  />
                </Panel>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Panel title="Skills" icon={IconTarget}>
                  <SkillPills items={snapshot.skills} />
                  <h4 className="section-label mt-4 mb-2">Tools &amp; technologies</h4>
                  <SkillPills items={snapshot.tools_technologies} />
                </Panel>

                <Panel title="Education" icon={IconGraduation}>
                  {snapshot.education.length > 0 ? (
                    <ul className="space-y-2.5 text-sm">
                      {snapshot.education.map((entry, index) => (
                        <li
                          key={`${entry.degree}-${index}`}
                          className="border-l-2 border-coral/40 pl-3"
                        >
                          <div className="font-medium text-ink">{entry.degree ?? "—"}</div>
                          <div className="text-xs text-ink-muted">
                            {[entry.institution, entry.year].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm text-ink-faint">Not listed</span>
                  )}
                </Panel>
              </div>

              {snapshot.summary && (
                <Panel title="Summary" icon={IconClipboard}>
                  <p className="text-sm leading-relaxed text-ink">{snapshot.summary}</p>
                </Panel>
              )}

              {snapshot.key_achievements.length > 0 && (
                <Panel title="Key achievements" icon={IconAward}>
                  <ul className="space-y-2 text-sm text-ink">
                    {snapshot.key_achievements.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadJson} className="btn-secondary text-xs">
                  <IconDownload className="h-3.5 w-3.5" />
                  Download JSON
                </button>
                <button
                  type="button"
                  onClick={downloadProfileCsv}
                  className="btn-secondary text-xs"
                >
                  <IconDownload className="h-3.5 w-3.5" />
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
        <section
          role="tabpanel"
          id="candidate-panel-kit"
          aria-labelledby="candidate-tab-kit"
          className="animate-fade space-y-4"
        >
          {kitError && <Alert>{kitError}</Alert>}

          {candidate.interview_kit ? (
            <>
              <div className="card p-5 sm:p-6">
                <Markdown>{candidate.interview_kit}</Markdown>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadKit} className="btn-secondary text-xs">
                  <IconDownload className="h-3.5 w-3.5" />
                  Download kit
                </button>
                <button
                  type="button"
                  onClick={() => generateKit(true)}
                  disabled={generating}
                  className="btn-ghost text-xs"
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  {generating ? "Regenerating…" : "Regenerate"}
                </button>
              </div>
            </>
          ) : (
            <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-coral/25 bg-coral/12 text-coral-light">
                <IconClipboard className="h-6 w-6" />
              </span>
              <h3 className="text-lg">Interview kit not generated yet</h3>
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
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
