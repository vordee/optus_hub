import type { ReactNode } from "react";

import { AppIcon } from "../../../app/icons";

type ModalShellProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function ModalShell({
  eyebrow,
  title,
  description,
  onClose,
  children,
  className = "",
}: ModalShellProps) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className={[
          "flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-2xl",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-6 border-b border-border/70 px-6 py-5 sm:px-7">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
            <h3 className="font-heading text-2xl font-semibold text-foreground">{title}</h3>
            {description && <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          <button
            aria-label="Fechar modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/60 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15"
            onClick={onClose}
            type="button"
          >
            <AppIcon name="close" />
          </button>
        </div>
        <div className="overflow-auto px-6 py-6 sm:px-7">{children}</div>
      </div>
    </div>
  );
}
