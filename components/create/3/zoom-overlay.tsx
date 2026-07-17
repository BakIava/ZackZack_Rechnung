import type { ReactNode } from "react";
import { FileText, X } from "lucide-react";
import "./zoom-overlay.css";

interface ZoomOverlayProps {
  /** Deutscher Belegtitel (Dokument bleibt LTR/Deutsch). */
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const STROKE = 1.75;

/** Vollbild-Zoom der A4-Vorschau. Dokument bleibt LTR/Deutsch. */
export function ZoomOverlay({ title, onClose, children }: ZoomOverlayProps) {
  return (
    <div className="a4-zoom-wrap" dir="ltr">
      <div className="a4-zoom-bar">
        <span className="a4-zoom-title">
          <FileText size={17} strokeWidth={STROKE} aria-hidden />
          {title}
        </span>
        <button type="button" className="a4-zoom-x" onClick={onClose} aria-label="×">
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <div className="a4-zoom-scroll">{children}</div>
    </div>
  );
}
