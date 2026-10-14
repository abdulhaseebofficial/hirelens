/** Small presentational primitives shared across pages. */

import type { ComponentType, ReactNode, SVGProps } from "react";

import {
  IconAlert,
  IconCheckCircle,
  IconInbox,
  IconInfo,
  IconSparkles,
} from "@/components/icons";

export function Spinner({ label, className = "h-4 w-4" }: { label?: string; className?: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-muted" role="status">
      <span
        className={`animate-spin rounded-full border-2 border-line border-t-coral ${className}`}
        aria-hidden="true"
      />
      {label && <span className="text-sm">{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-60 flex-col items-center justify-center gap-4">
      <span
        className="h-9 w-9 animate-spin rounded-full border-[2.5px] border-line border-t-coral"
        aria-hidden="true"
      />
      <p className="text-sm text-ink-muted" role="status">
        {label}
      </p>
    </div>
  );
}

/** Grey placeholder block for content that is still in flight. */
export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** The dashboard's loading state: card outlines in the shape of the real list. */
export function CardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="card space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </li>
      ))}
    </ul>
  );
}

const ALERT_TONES = {
  error: {
    icon: IconAlert,
    shell: "border-fit-low/35 bg-fit-low/10",
    accent: "text-fit-low-light",
  },
  warning: {
    icon: IconAlert,
    shell: "border-fit-mid/35 bg-fit-mid/10",
    accent: "text-fit-mid-light",
  },
  info: {
    icon: IconInfo,
    shell: "border-violet/35 bg-violet/10",
    accent: "text-violet-light",
  },
  success: {
    icon: IconCheckCircle,
    shell: "border-fit-high/35 bg-fit-high/10",
    accent: "text-fit-high-light",
  },
} as const;

export function Alert({
  tone = "error",
  children,
}: {
  tone?: keyof typeof ALERT_TONES;
  children: ReactNode;
}) {
  const { icon: Icon, shell, accent } = ALERT_TONES[tone];

  return (
    <div
      className={`animate-fade flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-ink ${shell}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${accent}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = IconInbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="card animate-rise flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="mb-1 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-paper-sunken text-coral">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-muted">{description}</p>
      {action}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-xs">
          <span className="font-medium text-ink-muted">{label}</span>
          <span className="font-semibold text-coral-light tabular-nums">{percent}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-paper-sunken ring-1 ring-line"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral-dark via-coral to-coral-light
            transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, { chip: string; dot: string }> = {
  completed: { chip: "border-fit-high/30 bg-fit-high/12 text-fit-high-light", dot: "bg-fit-high" },
  running: { chip: "border-coral/30 bg-coral/12 text-coral-light", dot: "bg-coral animate-breathe" },
  pending: {
    chip: "border-line-strong bg-paper-sunken text-ink-muted",
    dot: "bg-ink-faint animate-breathe",
  },
  failed: { chip: "border-fit-low/30 bg-fit-low/12 text-fit-low-light", dot: "bg-fit-low" },
};

export function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    chip: "border-line bg-paper-sunken text-ink-muted",
    dot: "bg-ink-faint",
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1
        text-[0.7rem] font-bold tracking-wide uppercase ${style.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

/** Headline number with a caption — used in the summary rows. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-coral/20 bg-coral/10 text-coral-light">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="section-label">{label}</p>
        <p className="font-serif text-2xl leading-tight font-semibold text-ink tabular-nums">
          {value}
        </p>
        {hint && <p className="truncate text-xs text-ink-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function SkillPills({ items, max = 12 }: { items: string[]; max?: number }) {
  if (items.length === 0) {
    return <span className="text-sm text-ink-faint">Not listed</span>;
  }

  const shown = items.slice(0, max);
  const remaining = items.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <span key={item} className="pill">
          {item}
        </span>
      ))}
      {remaining > 0 && (
        <span className="pill border-line bg-paper-sunken text-ink-muted">+{remaining} more</span>
      )}
    </div>
  );
}

export function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/70 py-2 text-sm last:border-0">
      <span className="flex shrink-0 items-center gap-2 text-ink-muted">
        {Icon && <Icon className="h-4 w-4 text-ink-faint" />}
        {label}
      </span>
      <span className="truncate text-right font-medium text-ink" title={value ?? undefined}>
        {value?.trim() || "—"}
      </span>
    </div>
  );
}

/** Page heading with an optional eyebrow and a slot for actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="eyebrow flex items-center gap-1.5">
            <IconSparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 text-[1.7rem] leading-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Pill-style tab bar. Controlled by the caller. */
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  label,
}: {
  tabs: ReadonlyArray<{ id: T; label: string; icon?: ComponentType<SVGProps<SVGSVGElement>> }>;
  active: T;
  onChange: (id: T) => void;
  idPrefix: string;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-line bg-paper-sunken p-1"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5
              text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                selected
                  ? "bg-paper-raised text-ink shadow-card"
                  : "text-ink-muted hover:text-ink"
              }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** Circular monogram used wherever a person needs a face. */
export function Avatar({
  name,
  className = "h-9 w-9 text-xs",
}: {
  name: string;
  className?: string;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-line-strong
        bg-paper-hover font-semibold text-ink ${className}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
