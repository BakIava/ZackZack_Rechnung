import { FileText, X } from "lucide-react";
import { DOC_DE, type InvoicePreview } from "@/lib/demo/create-data";
import { InvoiceA4 } from "./invoice-a4";

interface ZoomOverlayProps {
  invoice: InvoicePreview;
  onClose: () => void;
}

const STROKE = 1.75;

/** Vollbild-Zoom der A4-Vorschau. Dokument bleibt LTR/Deutsch. */
export function ZoomOverlay({ invoice, onClose }: ZoomOverlayProps) {
  return (
    <div className="a4-zoom-wrap" dir="ltr">
      <div className="a4-zoom-bar">
        <span className="a4-zoom-title">
          <FileText size={17} strokeWidth={STROKE} aria-hidden />
          {DOC_DE.invoice} {invoice.number}
        </span>
        <button type="button" className="a4-zoom-x" onClick={onClose} aria-label="×">
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <div className="a4-zoom-scroll">
        <InvoiceA4 invoice={invoice} />
      </div>
    </div>
  );
}
