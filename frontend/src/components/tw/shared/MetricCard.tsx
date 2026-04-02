import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  className?: string;
};

export function MetricCard({ label, value, subtitle, className = "" }: MetricCardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-card/90 p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
        {label}
      </span>
      <strong className="mt-2 block font-heading text-2xl font-bold text-foreground">{value}</strong>
      {subtitle && <small className="mt-1 block text-xs leading-5 text-muted-foreground">{subtitle}</small>}
    </div>
  );
}
