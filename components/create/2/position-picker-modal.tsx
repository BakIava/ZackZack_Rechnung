"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import "./position-picker-modal.css";

interface PositionPickerModalProps {
  dir: "ltr" | "rtl";
  pending?: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function PositionPickerModal({ dir, pending, onClose, children }: PositionPickerModalProps) {
  const t = useTranslations("Step2");
  return (
    <Modal open onClose={onClose} busy={pending} dir={dir} size="lg"
      className="zz-modal--positions" ariaLabel={t("addPosition")}
    >
      <div className="dmodal-head">
        <span className="dmodal-title">{t("addPosition")}</span>
        <button type="button" className="sheet-x" onClick={onClose} disabled={pending} aria-label={t("close")}>
          <X size={18} strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      <div className="dmodal-body">{children}</div>
    </Modal>
  );
}
