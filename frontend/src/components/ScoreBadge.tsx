import type { FitTier } from "@/types";

const TIER_GRADIENT: Record<FitTier, string> = {
  high: "from-fit-high-light to-fit-high",
  mid: "from-coral to-coral-dark",
  low: "from-fit-low-light to-fit-low",
};

const TIER_SOLID: Record<FitTier, string> = {
  high: "bg-fit-high",
  mid: "bg-coral-light",
  low: "bg-fit-low",
};

const SIZES = {
  sm: "h-14 w-14 text-lg",
  md: "h-20 w-20 text-2xl",
  lg: "h-30 w-30 text-4xl",
} as const;

interface ScoreBadgeProps {
  score: number | null;
  tier: FitTier | null;
  size?: keyof typeof SIZES;
}

export function ScoreBadge({ score, tier, size = "md" }: ScoreBadgeProps) {
  const resolvedTier = tier ?? "mid";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br
        font-serif font-bold text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]
        ${TIER_GRADIENT[resolvedTier]} ${SIZES[size]}`}
      role="img"
      aria-label={score === null ? "Score unavailable" : `Fit score ${score} out of 100`}
    >
      {score ?? "?"}
    </div>
  );
}

export function VerdictPill({ verdict, tier }: { verdict: string | null; tier: FitTier | null }) {
  if (!verdict) return null;
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1 text-[0.8rem] font-bold text-white
        ${TIER_SOLID[tier ?? "mid"]}`}
    >
      {verdict}
    </span>
  );
}
