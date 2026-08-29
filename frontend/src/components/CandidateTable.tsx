import type { CandidateSummary, FitTier } from "@/types";
import { StatusChip } from "@/components/ui";

const BAR_COLOR: Record<FitTier, string> = {
  high: "bg-fit-high-light",
  mid: "bg-coral",
  low: "bg-fit-low-light",
};

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
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">Candidates ranked by fit score</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="w-14 px-4 py-3 section-label">
                #
              </th>
              <th scope="col" className="px-4 py-3 section-label">
                Candidate
              </th>
              <th scope="col" className="w-44 px-4 py-3 section-label">
                Score
              </th>
              <th scope="col" className="w-36 px-4 py-3 section-label">
                Verdict
              </th>
              <th scope="col" className="px-4 py-3 section-label">
                Current role
              </th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => {
              const selected = candidate.id === selectedId;
              const failed = candidate.status === "failed";

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
                    ${selected ? "bg-coral/12" : "hover:bg-paper-sunken/70"}`}
                >
                  <td className="px-4 py-3 font-serif text-ink-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{candidate.display_name}</div>
                    <div className="truncate text-xs text-ink-muted" title={candidate.filename}>
                      {candidate.email ?? candidate.filename}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {failed ? (
                      <StatusChip status="failed" />
                    ) : candidate.score === null ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-sunken">
                          <div
                            className={`h-full rounded-full ${BAR_COLOR[candidate.tier ?? "mid"]}`}
                            style={{ width: `${candidate.score}%` }}
                          />
                        </div>
                        <span className="font-serif font-semibold tabular-nums">
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
