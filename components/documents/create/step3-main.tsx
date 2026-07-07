"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Lock,
  Maximize2,
  ReceiptText,
  TriangleAlert,
} from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import { DOKUMENT_DE } from "@/lib/documents/document-de";
import { finalizeDocument, type FinalizeError } from "@/lib/documents/finalize-actions";
import { istFinalisierbar, type PflichtCheck } from "@/lib/legal/dokumentPflicht";
import type { DocumentPreview } from "@/types/document";
import { FlowSteps } from "@/components/documents/create/FlowSteps";
import { DocumentA4 } from "./document-a4";
import { FinalizeDialog } from "./finalize-dialog";
import { PflichtList } from "./pflicht-list";
import { ShareButtons } from "./share-buttons";
import { ZoomOverlay } from "./zoom-overlay";

interface Step3MainProps {
  dir: "ltr" | "rtl";
  preview: DocumentPreview;
  checks: PflichtCheck[];
}

const STROKE = 1.75;

const ERROR_KEY: Record<FinalizeError, string> = {
  notAuthenticated: "errNotAuthenticated",
  notFinalizable: "errNotFinalizable",
  issueDateMissing: "errIssueDate",
  unknown: "errUnknown",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Schritt 3 (Vorschau & Finalisierung) — Desktop: A4-Vorschau links, sticky
 *  Aktions-Sidebar rechts. Dokumentinhalt bleibt Deutsch/LTR; die Bedienung
 *  folgt der UI-Sprache. Entwurf: Pflicht-Check + Finalisieren. Finalisiert:
 *  read-only mit echter Nummer (PDF/Teilen folgt im nächsten Schritt). */
export function Step3Main({ dir, preview, checks }: Step3MainProps) {
  const t = useTranslations("Create");
  const router = useRouter();
  const [zoom, setZoom] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorCode, setErrorCode] = useState<FinalizeError | null>(null);
  const [pending, startTransition] = useTransition();

  const isDraft = preview.status === "draft";
  const isRechnung = preview.docType === "invoice";
  const canFinalize = istFinalisierbar(checks);
  const total = preview.items.reduce((sum, p) => sum + p.totalAmount, 0);

  const customerName = preview.customer?.name ?? "—";
  const customerInitials = preview.customer ? initialsOf(preview.customer.name) : "—";
  const numberText = preview.documentNumber ?? DOKUMENT_DE.entwurfPlatzhalter;
  const zoomTitle = `${isRechnung ? DOKUMENT_DE.rechnung : DOKUMENT_DE.angebot}${
    preview.documentNumber ? ` ${preview.documentNumber}` : ""
  }`;

  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;
  const headerTitle = isRechnung ? t("createInvoiceTitle") : t("createQuoteTitle");
  const backHref = isDraft ? `/create/${preview.id}/2` : `/documents`;

  function handleConfirm() {
    setErrorCode(null);
    startTransition(async () => {
      const res = await finalizeDocument(preview.id);
      if ("error" in res) {
        setErrorCode(res.error);
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      // Server-Component neu laden → Status jetzt 'finalized', echte Nummer sichtbar.
      router.refresh();
    });
  }

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <Link href={backHref} className="dflow-back" aria-label={t("back")}>
            <BackChevron size={20} strokeWidth={STROKE} aria-hidden />
          </Link>
          <div>
            <div className="dflow-title">{headerTitle}</div>
            <div className="dflow-sub">{t("previewSend")}</div>
          </div>
          {isDraft && <FlowSteps current={3} />}
        </div>

        <div className="d2-ctx">
          <span className="p2-chip p2-chip--mode">
            {isRechnung ? (
              <ReceiptText size={15} strokeWidth={STROKE} aria-hidden />
            ) : (
              <FileText size={15} strokeWidth={STROKE} aria-hidden />
            )}
            {isRechnung ? t("invoice") : t("offer")}
          </span>
          <span className="p2-chip">
            <span className="p2-av">{customerInitials}</span>
            {customerName}
          </span>
        </div>

        <div className="d3-wrap">
          <div>
            <div className="d3-doctop">
              <span className="d3-doctop-t">
                <Eye size={17} strokeWidth={STROKE} aria-hidden />
                {t("viewPreview")} · {numberText}
              </span>
              <button type="button" className="d3-zoom" onClick={() => setZoom(true)}>
                <Maximize2 size={16} strokeWidth={STROKE} aria-hidden />
                {t("tapZoom")}
              </button>
            </div>
            <div className="d3-docstage">
              <DocumentA4 preview={preview} />
            </div>
          </div>

          <div className="d3-side">
            {isDraft && (
              <div className={`d3-card${canFinalize ? "" : " has-issue"}`}>
                <PflichtList checks={checks} documentId={preview.id} />
              </div>
            )}

            <div className="d3-sumcard">
              <div className="d3-sum-l">
                {isRechnung ? t("invoiceAmount") : t("quoteAmount")}
              </div>
              <div className="d3-sum-v">{formatMoney(total)}</div>
              {preview.isKleinunternehmer && (
                <div className="d3-sum-ku">
                  <Lock size={14} strokeWidth={STROKE} aria-hidden />
                  {t("kuNote")}
                </div>
              )}
            </div>

            <div className="d3-actcard">
              {isDraft ? (
                <>
                  {!canFinalize && (
                    <div className="locknote">
                      <TriangleAlert size={15} strokeWidth={STROKE} aria-hidden />
                      {t("lockedHint")}
                    </div>
                  )}
                  {errorCode && (
                    <div className="locknote">
                      <TriangleAlert size={15} strokeWidth={STROKE} aria-hidden />
                      {t(ERROR_KEY[errorCode])}
                    </div>
                  )}
                  <button
                    type="button"
                    className="d3-pdfbtn"
                    disabled={!canFinalize || pending}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Lock size={21} strokeWidth={2.4} aria-hidden />
                    {t("finalize")}
                  </button>
                  <Link href={`/create/${preview.id}/2`} className="d3-back">
                    {t("back")}
                  </Link>
                </>
              ) : (
                <>
                  <div className="share-success">
                    <span className="share-success-ic">
                      <Check size={20} strokeWidth={2.5} color="#fff" aria-hidden />
                    </span>
                    <div>
                      <div className="share-success-t">{t("finalizedTitle")}</div>
                      <div className="share-success-s">
                        {isRechnung ? t("invoice") : t("offer")} {preview.documentNumber}
                      </div>
                    </div>
                  </div>
                  <div className="share-via">{t("shareVia")}</div>
                  <ShareButtons preview={preview} />
                  <Link href="/documents" className="d3-back d3-back--done">
                    <Check size={18} strokeWidth={2.2} aria-hidden />
                    {t("done")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {zoom && (
        <ZoomOverlay title={zoomTitle} onClose={() => setZoom(false)}>
          <DocumentA4 preview={preview} />
        </ZoomOverlay>
      )}

      {confirmOpen && (
        <FinalizeDialog
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
          pending={pending}
        />
      )}
    </main>
  );
}
