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
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { INVOICE_PREVIEW, invoiceTotalCents } from "@/lib/demo/create-data";
import { formatMoney } from "@/lib/format";
import {
  istExportierbar,
  pruefePflichtangaben,
} from "@/lib/legal/pflichtangaben";
import { CheckList, type CheckRow } from "./check-list";
import { InvoiceA4 } from "./invoice-a4";
import { ShareButtons } from "./share-buttons";
import { ZoomOverlay } from "./zoom-overlay";

interface Step3MainProps {
  dir: "ltr" | "rtl";
  documentId?: string;
}

const STROKE = 1.75;

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

/** Schritt 3 (Vorschau & Versand) — Desktop-Hauptbereich: A4-Vorschau links,
 *  sticky Aktions-Sidebar rechts. Interaktiv (PDF-Phase, Zoom). */
export function Step3Main({ dir, documentId }: Step3MainProps) {
  const t = useTranslations("Create");
  const [created, setCreated] = useState(false);
  const [zoom, setZoom] = useState(false);

  const invoice = INVOICE_PREVIEW;
  const total = invoiceTotalCents(invoice);
  const customerInitials = initialsOf(invoice.recipient.name);

  // Pflichtangaben aus der echten Legal-Prüfung ableiten.
  const items = pruefePflichtangaben({
    ausstellerName: invoice.issuer.name,
    empfaengerName: invoice.recipient.name,
    steuernummer: invoice.issuer.taxNo,
    datum: invoice.date,
    hatLeistung: invoice.positions.length > 0,
    betragCents: total,
    rechnungsnummer: invoice.number,
    mwstAusgewiesen: false,
    kleinunternehmerHinweisGesetzt: true,
  });
  const ok = Object.fromEntries(items.map((i) => [i.key, i.ok]));
  const allOk = istExportierbar(items);
  const rows: CheckRow[] = [
    { id: "issuer", label: t("ckIssuer"), ok: !!ok.aussteller && !!ok.steuernummer },
    { id: "recipient", label: t("ckRecipient"), ok: !!ok.empfaenger },
    { id: "position", label: t("ckPosition"), ok: !!ok.leistung },
    { id: "number", label: t("ckNumber"), ok: !!ok.nummer },
    { id: "vat", label: t("ckVat"), ok: !!ok.kleinunternehmer },
    { id: "date", label: t("ckDate"), ok: !!ok.datum },
  ];
  const checkLabels = {
    title: t("checkTitle"),
    allGood: t("checkAllGood"),
    some: t("checkSome"),
    correct: t("correct"),
  };

  const BackChevron = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <Link href={`/create/2${documentId ? `?document_id=${documentId}` : ""}`} className="dflow-back" aria-label={t("back")}>
            <BackChevron size={20} strokeWidth={STROKE} aria-hidden />
          </Link>
          <div>
            <div className="dflow-title">{t("createInvoiceTitle")}</div>
            <div className="dflow-sub">{t("previewSend")}</div>
          </div>
          <div className="dsteps2">
            <div className="dstep2">
              <span className="dstep2-dot dstep2-dot--done">
                <Check size={15} strokeWidth={2.5} color="#fff" aria-hidden />
              </span>
              <span className="dstep2-lbl">{t("step1")}</span>
            </div>
            <span className="dstep2-line dstep2-line--done" />
            <div className="dstep2">
              <span className="dstep2-dot dstep2-dot--done">
                <Check size={15} strokeWidth={2.5} color="#fff" aria-hidden />
              </span>
              <span className="dstep2-lbl">{t("step2")}</span>
            </div>
            <span className="dstep2-line dstep2-line--done" />
            <div className="dstep2 dstep2--active">
              <span className="dstep2-dot">3</span>
              <span className="dstep2-lbl">{t("step3")}</span>
            </div>
          </div>
        </div>

        <div className="d2-ctx">
          <span className="p2-chip p2-chip--mode">
            <ReceiptText size={15} strokeWidth={STROKE} aria-hidden />
            {t("rechnung")}
          </span>
          <span className="p2-chip">
            <span className="p2-av">{customerInitials}</span>
            {invoice.recipient.name}
          </span>
        </div>

        <div className="d3-wrap">
          <div>
            <div className="d3-doctop">
              <span className="d3-doctop-t">
                <Eye size={17} strokeWidth={STROKE} aria-hidden />
                {t("viewPreview")} · {invoice.number}
              </span>
              <button type="button" className="d3-zoom" onClick={() => setZoom(true)}>
                <Maximize2 size={16} strokeWidth={STROKE} aria-hidden />
                {t("tapZoom")}
              </button>
            </div>
            <div className="d3-docstage">
              <InvoiceA4 invoice={invoice} />
            </div>
          </div>

          <div className="d3-side">
            <div className={`d3-card${allOk ? "" : " has-issue"}`}>
              <CheckList rows={rows} labels={checkLabels} />
            </div>

            <div className="d3-sumcard">
              <div className="d3-sum-l">{t("invoiceAmount")}</div>
              <div className="d3-sum-v">{formatMoney(total)}</div>
              <div className="d3-sum-ku">
                <Lock size={14} strokeWidth={STROKE} aria-hidden />
                {t("kuNote")}
              </div>
            </div>

            <div className="d3-actcard">
              {!created ? (
                <>
                  {!allOk && (
                    <div className="locknote">
                      <TriangleAlert size={15} strokeWidth={STROKE} aria-hidden />
                      {t("lockedHint")}
                    </div>
                  )}
                  <button
                    type="button"
                    className="d3-pdfbtn"
                    disabled={!allOk}
                    onClick={() => setCreated(true)}
                  >
                    <FileText size={21} strokeWidth={2.4} aria-hidden />
                    {t("createPdf")}
                  </button>
                  <Link href={`/create/2${documentId ? `?document_id=${documentId}` : ""}`} className="d3-back">
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
                      <div className="share-success-t">{t("pdfReady")}</div>
                      <div className="share-success-s">
                        {t("rechnung")} {invoice.number} · {t("pdfReadySub")}
                      </div>
                    </div>
                  </div>
                  <span className="share-via">{t("shareVia")}</span>
                  <ShareButtons
                    labels={{ wa: t("shareWa"), mail: t("shareMail"), save: t("shareSave") }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {zoom && <ZoomOverlay invoice={invoice} onClose={() => setZoom(false)} />}
    </main>
  );
}
