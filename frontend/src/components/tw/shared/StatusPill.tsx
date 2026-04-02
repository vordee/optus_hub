import type { ReactNode } from "react";

type StatusTone = "neutral" | "primary" | "success" | "warning" | "danger";

type StatusPillProps = {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-border bg-muted/70 text-foreground",
  primary: "border-primary/20 bg-primary/10 text-primary",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusPill({ tone = "neutral", children, className = "" }: StatusPillProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        TONE_CLASS[tone],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
