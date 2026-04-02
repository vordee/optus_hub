import { type ReactNode } from "react";

type ClassName = string | undefined;

export function cx(...parts: Array<ClassName | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export function PageShell({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("space-y-6 animate-fade-in", className)}>{children}</section>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cx("border-b border-border/70 pb-4", className)}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
      <h2 className="mt-1 font-heading text-2xl font-bold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <article className={cx("rounded-2xl border border-border bg-card shadow-card", className)}>
      {children}
    </article>
  );
}

export function PanelBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("p-5", className)}>{children}</div>;
}

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-xl border border-border bg-secondary/50 p-4", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{label}</span>
      <div className="mt-2 font-heading text-3xl font-bold text-foreground">{value}</div>
      {detail && <div className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "muted" | "accent" | "danger" }) {
  const toneClasses = {
    default: "bg-primary/10 text-primary",
    muted: "bg-secondary text-foreground",
    accent: "bg-amber-500/10 text-amber-800",
    danger: "bg-destructive/10 text-destructive",
  }[tone];

  return <span className={cx("inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium", toneClasses)}>{children}</span>;
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
      <strong className="font-heading text-base text-foreground">{title}</strong>
      <p className="max-w-2xl leading-6">{description}</p>
      {action}
    </div>
  );
}

export function InlineAlert({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{children}</div>;
}

export function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

export function FormCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("grid gap-4", className)}>{children}</div>;
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3 pt-1">{children}</div>;
}

export const inputClassName =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-secondary/70";

export const selectClassName =
  "w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-secondary/70";

export const textareaClassName =
  "min-h-32 w-full rounded-xl border border-input bg-white px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10";

export const buttonPrimaryClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

export const buttonGhostClassName =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/60 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60";
