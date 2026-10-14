import { Avatar, StatusChip } from "@/components/ui";
import type { CandidateSummary, FitTier } from "@/types";

const BAR_COLOR: Record<FitTier, string> = {
  high: "bg-fit-high",
  mid: "bg-coral",
  low: "bg-fit-low",
};

const SCORE_TEXT: Record<FitTier, string> = {
  high: "text-fit-high-light",
  mid: "text-coral-light",
  low: "text-fit-low-light",
};

/** Podium tint for the top three; everyone else gets a plain rank number. */
const RANK_STYLE = [
  "border-fit-mid/40 bg-fit-mid/15 text-fit-mid-light",
  "border-line-strong bg-paper-hover text-ink",
  "border-coral/30 bg-coral/12 text-coral-light",
];

interface CandidateTableProps {
  candidates: CandidateSummary[];
  selectedId: string | null;
  onSelect: (candidate: CandidateSummary) => void;
}

export function CandidateTable({ candidates, selectedId, onSelect }: CandidateTableProps) {
  return (
    <div className="card overflow-hidden">
      {/* Horizontal scroll is contained here so the page itself never scrolls sideways. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">Candidates ranked by fit score</caption>
          <thead>
            <tr className="border-b border-line bg-paper-sunken/60 text-left">
              <th scope="col" className="section-label w-16 px-4 py-3">
                Rank
              </th>
              <th scope="col" className="section-label px-4 py-3">
                Candidate
              </th>
              <th scope="col" className="section-label w-48 px-4 py-3">
                Fit score
              </th>
              <th scope="col" className="section-label w-36 px-4 py-3">
                Verdict
              </th>
              <th scope="col" className="section-label px-4 py-3">
                Current role
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => {
              const selected = candidate.id === selectedId;
              const failed = candidate.status === "failed";
              const tier = candidate.tier ?? "mid";

              return (
                <tr
                  key={candidate.id}
                  onClick={() => onSelect(candidate)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(candidate);
                    }
                  }}
                  tabIndex={0}
                  aria-current={selected}
                  className={`cursor-pointer border-b border-line/60 transition-colors last:border-0
                    ${
                      selected
                        ? "bg-coral/12 shadow-[inset_3px_0_0_0_var(--color-coral)]"
                        : "hover:bg-paper-hover/70"
                    }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg border font-serif
                        text-xs font-bold tabular-nums ${
                          RANK_STYLE[index] ?? "border-line bg-paper-sunken text-ink-muted"
                        }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={candidate.display_name} className="h-8 w-8 text-[0.65rem]" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">
                          {candidate.display_name}
                        </div>
                        <div className="truncate text-xs text-ink-faint" title={candidate.filename}>
                          {candidate.email ?? candidate.filename}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {failed ? (
                      <StatusChip status="failed" />
                    ) : candidate.score === null ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper-sunken ring-1 ring-line">
                          <div
                            className={`h-full rounded-full transition-[width] duration-700 ${BAR_COLOR[tier]}`}
                            style={{ width: `${candidate.score}%` }}
                          />
                        </div>
                        <span className={`font-serif font-bold tabular-nums ${SCORE_TEXT[tier]}`}>
                          {candidate.score}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{candidate.verdict ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="truncate text-ink-muted">
                      {failed
                        ? (candidate.error ?? "Could not be processed")
                        : (candidate.current_role ?? "—")}
                    </div>
                    {candidate.current_company && !failed && (
                      <div className="truncate text-xs text-ink-faint">
                        {candidate.current_company}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
