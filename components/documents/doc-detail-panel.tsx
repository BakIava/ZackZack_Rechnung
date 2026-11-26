"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import "./doc-detail-panel.css";

interface DocDetailPanelProps {
  /** true, sobald ein Dokument ausgewählt ist. */
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Hülle um das Dokument-Detail. Auf breiten Screens ohne eigene Box (rechte
 * Grid-Spalte wie bisher); auf schmalen ein Overlay-Panel am Rand mit
 * Abdunklung und X zum Schließen.
 */
export function DocDetailPanel({ open, onClose, children }: DocDetailPanelProps) {
  const t = useTranslations("Documents");

  return (
    <div className="ddpanel" data-open={open ? "1" : "0"}>
      <button
        type="button"
        className="ddpanel-backdrop"
        aria-label={t("closeDetail")}
        onClick={onClose}
      />
      <div className="ddpanel-sheet">
        <div className="ddpanel-bar">
          <button
            type="button"
            className="iconbtn"
            aria-label={t("closeDetail")}
            title={t("closeDetail")}
            onClick={onClose}
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
