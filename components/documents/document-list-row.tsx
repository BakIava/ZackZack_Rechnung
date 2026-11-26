"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, FileText, ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentListItem } from "@/types/document";
import { formatDateDE, formatMoney } from "@/lib/format";
import {
  getDocumentStatusMessageKey,
  getDocumentUiStatus,
} from "@/lib/documents/document-display-status";
import { DeleteDraftButton } from "./delete-draft-button";
import "./document-list-row.css";

const STROKE = 1.75;

interface DocumentListRowProps {
  doc: DocumentListItem;
  selected: boolean;
  dir: "ltr" | "rtl";
  onOpen: (doc: DocumentListItem) => void;
  /** Nach dem Löschen eines Entwurfs (nur bei `doc.deletable`). */
  onDeleted: () => void;
}

/** Eine Zeile der Dokumentenliste; löschbare Entwürfe mit Papierkorb daneben. */
export function DocumentListRow({ doc, selected, dir, onOpen, onDeleted }: DocumentListRowProps) {
  const t = useTranslations("Documents");
  const statusT = useTranslations("DocumentStatus");
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const displayStatus = getDocumentUiStatus(doc);
  const statusLabel = statusT(getDocumentStatusMessageKey(displayStatus));

  return (
    <div className="hrow-item">
      <button className="hrow" data-sel={selected ? "1" : "0"} onClick={() => onOpen(doc)}>
        <span className={`hrow-ic hrow-ic--${doc.type === "invoice" ? "rechnung" : "angebot"}`}>
          {doc.type === "invoice" ? (
            <ReceiptText size={21} strokeWidth={STROKE} />
          ) : (
            <FileText size={21} strokeWidth={STROKE} />
          )}
        </span>
        <span className="hrow-body">
          <span className="hrow-top">
            <span className="hrow-num">{doc.documentNumber}</span>
            {doc.isOverdue && (
              <span className="hflag">
                <AlertTriangle size={12} strokeWidth={2.5} />
                {t("overdue")}
              </span>
            )}
          </span>
          <span className="hrow-name">{doc.customerName}</span>
          <span className="hrow-meta">· {formatDateDE(doc.issueDate)}</span>
        </span>
        <span className="hrow-right">
          <span className="hrow-price">{formatMoney(doc.totalAmount)}</span>
          <span className={`pill pill--${displayStatus}`}>
            <i />
            {statusLabel}
          </span>
        </span>
        <span className="hrow-chev">
          <Chevron size={18} strokeWidth={STROKE} />
        </span>
      </button>
      {doc.deletable && (
        <DeleteDraftButton documentId={doc.id} dir={dir} variant="icon" onDeleted={onDeleted} />
      )}
    </div>
  );
}
