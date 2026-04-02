import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "right";
  compact?: boolean;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  compact = false,
  className = "",
}: SectionHeaderProps) {
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={["flex flex-col gap-1", alignClass, className].filter(Boolean).join(" ")}>
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
      <h3 className={compact ? "font-heading text-xl font-semibold text-foreground" : "font-heading text-2xl font-semibold text-foreground"}>
        {title}
      </h3>
      {description && (
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
