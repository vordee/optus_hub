import type {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PipelinePageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6">
      <header className="rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_48px_rgba(17,32,49,0.08)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-[0.16em] text-sky-700 uppercase">{eyebrow}</span>
            <h2 className="font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? <p className="max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

export function PipelineCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={joinClasses(
        "rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-[0_18px_48px_rgba(17,32,49,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function PipelineSectionHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={joinClasses("flex flex-col gap-3", compact ? "sm:flex-row sm:items-start sm:justify-between" : "lg:flex-row lg:items-start lg:justify-between")}>
      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-[0.16em] text-sky-700 uppercase">{eyebrow}</span>
        <h3 className="font-heading text-[clamp(1.2rem,2vw,1.7rem)] font-bold tracking-tight text-slate-900">
          {title}
        </h3>
        {description ? <p className="max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PipelineMetricGrid({
  children,
  columns = 4,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  const columnsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-2 xl:grid-cols-4",
  }[columns];

  return <div className={joinClasses("grid gap-3", columnsClass)}>{children}</div>;
}

export function PipelineMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <span className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase">{label}</span>
      <strong className="mt-3 block font-heading text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </strong>
      <p className="mt-2 text-sm leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

export function PipelinePill({
  children,
  tone = "navy",
}: {
  children: ReactNode;
  tone?: "navy" | "muted" | "accent" | "warning";
}) {
  const toneClasses = {
    navy: "bg-slate-900 text-white shadow-sm",
    muted: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    accent: "bg-sky-50 text-sky-800 ring-1 ring-sky-100",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-100",
  }[tone];

  return (
    <span
      className={joinClasses(
        "inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.14em] uppercase",
        toneClasses,
      )}
    >
      {children}
    </span>
  );
}

export function PipelineField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <small className="text-xs leading-5 text-slate-500">{hint}</small> : null}
    </label>
  );
}

export function PipelineInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={joinClasses(
        "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70",
        props.className,
      )}
    />
  );
}

export function PipelineSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={joinClasses(
        "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition",
        "focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70",
        props.className,
      )}
    />
  );
}

export function PipelineTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={joinClasses(
        "min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition",
        "placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-70",
        props.className,
      )}
    />
  );
}

export function PipelineCheckboxField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
      <input
        checked={checked}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        onChange={onChange}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

export function PipelineActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function PipelineButton({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
}) {
  const variantClasses = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  }[variant];

  return (
    <button
      {...props}
      className={joinClasses(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200",
        "focus:outline-none focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PipelineEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600">
      {children}
    </div>
  );
}

export function PipelineTableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}
