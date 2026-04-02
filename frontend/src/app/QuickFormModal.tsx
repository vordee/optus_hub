import { useEffect, type ReactNode } from "react";

import { ModalShell } from "../components/tw/shared/ModalShell";

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
    <ModalShell eyebrow={eyebrow} title={title} description={description} onClose={onClose}>
      {children}
    </ModalShell>
  );
}
