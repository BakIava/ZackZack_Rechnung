"use client";

import { Download, Loader2, Mail, MessageCircle, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentPreview } from "@/lib/documents/preview-types";
import { useShareDocument, type ShareChannel } from "./use-share-document";

interface ShareButtonsProps {
  preview: DocumentPreview;
}

const STROKE = 1.75;

/**
 * Versand-Optionen für das fertige PDF (WhatsApp / E-Mail / Speichern) —
 * gleichwertig und mobil-tauglich. Die eigentliche Logik (natives Teilen mit
 * Datei-Anhang, Desktop-Fallback) steckt in useShareDocument.
 */
export function ShareButtons({ preview }: ShareButtonsProps) {
  const t = useTranslations("Create");
  const { state, share } = useShareDocument({
    documentId: preview.id,
    docType: preview.docType,
    documentNumber: preview.documentNumber ?? "",
    companyName: preview.company.name,
    customerEmail: preview.customer?.email ?? null,
    customerPhone: preview.customer?.phone ?? null,
  });

  function iconFor(channel: ShareChannel) {
    if (state.pending === channel) {
      return <Loader2 size={24} strokeWidth={STROKE} color="#fff" className="share-spin" aria-hidden />;
    }
    if (channel === "whatsapp") return <MessageCircle size={24} strokeWidth={STROKE} color="#fff" aria-hidden />;
    if (channel === "email") return <Mail size={24} strokeWidth={STROKE} color="#fff" aria-hidden />;
    return <Download size={24} strokeWidth={STROKE} color="#fff" aria-hidden />;
  }

  const busy = state.pending !== null;

  return (
    <>
      <div className="sharegrid">
        {/* WhatsApp-Versand noch offen (WhatsApp-Business-Flow = Phase 2) →
            sichtbarer, aber deaktivierter Platzhalter. */}
        <button
          type="button"
          className="sharebtn sharebtn--wa"
          disabled
          aria-disabled="true"
        >
          <span className="sharebtn-ic">{iconFor("whatsapp")}</span>
          {t("shareWa")}
        </button>
        <button
          type="button"
          className="sharebtn sharebtn--mail"
          onClick={() => share("email")}
          disabled={busy}
        >
          <span className="sharebtn-ic">{iconFor("email")}</span>
          {t("shareMail")}
        </button>
        <button
          type="button"
          className="sharebtn sharebtn--save"
          onClick={() => share("download")}
          disabled={busy}
        >
          <span className="sharebtn-ic">{iconFor("download")}</span>
          {t("shareSave")}
        </button>
      </div>

      {state.error && (
        <div className="share-note share-note--err">
          <TriangleAlert size={15} strokeWidth={STROKE} aria-hidden />
          {t("shareError")}
        </div>
      )}
      {state.downloadedHint && !state.error && (
        <div className="share-note">
          <Download size={15} strokeWidth={STROKE} aria-hidden />
          {t("shareDownloadedHint")}
        </div>
      )}
    </>
  );
}
