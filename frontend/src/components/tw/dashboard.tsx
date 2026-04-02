import type { ReactNode } from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DashboardCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={joinClasses(
        "rounded-[28px] border shadow-[0_18px_48px_rgba(17,32,49,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DashboardSectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-[0.16em] text-sky-700 uppercase">{eyebrow}</span>
        <h3 className="font-heading text-[clamp(1.35rem,2vw,1.75rem)] font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function DashboardMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <span className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">{label}</span>
      <strong className="mt-3 block font-heading text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </strong>
      <p className="mt-2 text-sm leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

const pillTones = {
  navy: "bg-slate-900 text-white shadow-sm",
  muted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  accent: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
} as const;

export function DashboardPill({
  children,
  tone = "navy",
}: {
  children: ReactNode;
  tone?: keyof typeof pillTones;
}) {
  return (
    <span
      className={joinClasses(
        "inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em] uppercase",
        pillTones[tone],
      )}
    >
      {children}
    </span>
  );
}
