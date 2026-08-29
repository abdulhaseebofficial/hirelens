/** Small presentational primitives shared across pages. */

import type { ReactNode } from "react";

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-ink-muted" role="status">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-coral"
        aria-hidden="true"
      />
      {label && <span className="text-sm">{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-60 items-center justify-center">
      <Spinner label={label} />
    </div>
  );
}

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "info" | "warning" | "success";
  children: ReactNode;
}) {
  const tones = {
    error: "border-l-fit-low-light",
    warning: "border-l-coral",
    info: "border-l-coral",
    success: "border-l-fit-high-light",
  } as const;

  return (
    <div
      className={`rounded-xl border border-line border-l-4 bg-paper-raised px-4 py-3 text-sm
        text-ink ${tones[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-md text-sm text-ink-muted">{description}</p>
      {action}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between text-xs text-ink-muted">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-paper-sunken"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral to-coral-light transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-fit-high/20 text-fit-high-light border-fit-high/30",
    running: "bg-coral/20 text-coral-light border-coral/30",
    pending: "bg-coral/15 text-coral-light border-coral/25",
    failed: "bg-fit-low/20 text-fit-low-light border-fit-low/30",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize
        ${styles[status] ?? "border-line bg-paper-sunken text-ink-muted"}`}
    >
      {status}
    </span>
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
      {remaining > 0 && <span className="pill opacity-70">+{remaining} more</span>}
    </div>
  );
}

export function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span className="truncate text-right text-ink" title={value ?? undefined}>
        {value?.trim() || "—"}
      </span>
    </div>
  );
}
