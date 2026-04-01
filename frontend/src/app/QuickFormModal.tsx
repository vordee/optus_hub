import { useEffect, type ReactNode } from "react";

import { AppIcon } from "./icons";

type QuickFormModalProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export function QuickFormModal({
  open,
  title,
  eyebrow = "Ação rápida",
  description,
  onClose,
  children,
}: QuickFormModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div aria-modal="true" className="quick-form-modal-backdrop" onClick={onClose} role="dialog">
      <div className="quick-form-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="quick-form-modal-header">
          <div className="section-heading section-heading-compact">
            <span className="eyebrow">{eyebrow}</span>
            <h3>{title}</h3>
            {description && <p className="section-copy">{description}</p>}
          </div>
          <button
            aria-label="Fechar modal"
            className="ghost-button quick-form-modal-close"
            onClick={onClose}
            type="button"
          >
            <AppIcon name="close" />
          </button>
        </div>
        <div className="quick-form-modal-body">{children}</div>
      </div>
    </div>
  );
}
