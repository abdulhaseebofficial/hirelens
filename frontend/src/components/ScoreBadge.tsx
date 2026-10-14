import type { FitTier } from "@/types";

/**
 * The fit score, drawn as a progress ring rather than a filled disc — the arc
 * carries the 0-100 reading at a glance, so the number is confirmation rather
 * than the only signal.
 */

const TIER_STROKE: Record<FitTier, string> = {
  high: "text-fit-high-light",
  mid: "text-coral-light",
  low: "text-fit-low-light",
};

const TIER_SOLID: Record<FitTier, string> = {
  high: "bg-fit-high",
  mid: "bg-coral",
  low: "bg-fit-low",
};

const TIER_GLOW: Record<FitTier, string> = {
  high: "shadow-[0_0_36px_-8px_var(--color-fit-high)]",
  mid: "shadow-[0_0_36px_-8px_var(--color-coral)]",
  low: "shadow-[0_0_36px_-8px_var(--color-fit-low)]",
};

const SIZES = {
  sm: { box: "h-14 w-14", value: "text-lg", caption: "hidden", stroke: 7 },
  md: { box: "h-20 w-20", value: "text-2xl", caption: "text-[0.55rem]", stroke: 7 },
  lg: { box: "h-32 w-32", value: "text-4xl", caption: "text-[0.6rem]", stroke: 6 },
} as const;

const RADIUS = 50;

interface ScoreBadgeProps {
  score: number | null;
  tier: FitTier | null;
  size?: keyof typeof SIZES;
}

export function ScoreBadge({ score, tier, size = "md" }: ScoreBadgeProps) {
  const resolvedTier = tier ?? "mid";
  const { box, value, caption, stroke } = SIZES[size];

  // The ring is drawn on a 0-120 viewBox so `stroke` reads as a percentage of
  // the badge regardless of the rendered pixel size.
  const circumference = 2 * Math.PI * RADIUS;
  const filled = ((score ?? 0) / 100) * circumference;

  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-full bg-paper-raised
        ${box} ${TIER_GLOW[resolvedTier]}`}
      role="img"
      aria-label={score === null ? "Score unavailable" : `Fit score ${score} out of 100`}
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-line"
        />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className={`${TIER_STROKE[resolvedTier]} transition-[stroke-dasharray] duration-1000 ease-out`}
        />
      </svg>

      <div className="relative flex flex-col items-center leading-none">
        <span className={`font-serif font-bold text-ink tabular-nums ${value}`}>
          {score ?? "?"}
        </span>
        <span className={`mt-1 font-bold tracking-[0.14em] text-ink-faint uppercase ${caption}`}>
          / 100
        </span>
      </div>
    </div>
  );
}

export function VerdictPill({ verdict, tier }: { verdict: string | null; tier: FitTier | null }) {
  if (!verdict) return null;
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1 text-[0.78rem] font-bold text-white
        ${TIER_SOLID[tier ?? "mid"]}`}
    >
      {verdict}
    </span>
  );
}
