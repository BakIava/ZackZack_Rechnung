"use client";

import { AlertTriangle, FilePenLine, Loader2, ReceiptText, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  convertQuoteToInvoice,
  duplicateQuote,
  getQuoteConversionPreview,
} from "@/lib/documents/quote-actions";
import { formatMoney } from "@/lib/format";
import type { DocumentListItem, QuoteConversionPreview } from "@/types/document";
import "./quote-actions.css";

interface QuoteActionsProps {
  doc: DocumentListItem;
}

export function QuoteActions({ doc }: QuoteActionsProps) {
  const t = useTranslations("Documents");
  const router = useRouter();
  const [preview, setPreview] = useState<QuoteConversionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [converting, startConversion] = useTransition();
  const [duplicating, startDuplication] = useTransition();

  async function openConversion() {
    if (doc.convertedInvoiceId) {
      router.push(`/create/${doc.convertedInvoiceId}/2`);
      return;
    }
    setError(null);
    setLoadingPreview(true);
    const result = await getQuoteConversionPreview(doc.id);
    setLoadingPreview(false);
    if ("error" in result) {
      setError(t("conversionError"));
      return;
    }
    if (result.existingInvoiceId) {
      router.push(`/create/${result.existingInvoiceId}/2`);
      return;
    }
    setPreview(result);
  }

  function confirmConversion() {
    if (!preview) return;
    setError(null);
    startConversion(async () => {
      const result = await convertQuoteToInvoice(
        doc.id,
        preview.invoiceTotal,
        preview.isExpired,
      );
      if ("error" in result) {
        if (result.error === "conversionPreviewStale") {
          const refreshed = await getQuoteConversionPreview(doc.id);
          if (!("error" in refreshed)) setPreview(refreshed);
          setError(t("conversionPreviewStale"));
          return;
        }
        setError(t("conversionError"));
        return;
      }
      setPreview(null);
      router.push(`/create/${result.documentId}/2`);
      router.refresh();
    });
  }

  function adjustQuote() {
    if (doc.replacementQuoteId) {
      router.push(`/create/${doc.replacementQuoteId}/2`);
      return;
    }
    setError(null);
    startDuplication(async () => {
      const result = await duplicateQuote(doc.id);
      if ("error" in result) {
        setError(t("adjustQuoteError"));
        return;
      }
      router.push(`/create/${result.documentId}/2`);
    });
  }

  return (
    <>
      <div className="quote-detail-actions">
        <button
          type="button"
          className="hbtn-primary navy"
          disabled={loadingPreview || converting}
          onClick={openConversion}
        >
          {loadingPreview || converting ? (
            <Loader2 size={19} className="quote-action-spinner" aria-hidden />
          ) : (
            <ReceiptText size={19} strokeWidth={2.2} aria-hidden />
          )}
          {doc.convertedInvoiceId ? t("openConvertedInvoice") : t("aConvert")}
        </button>
        <button
          type="button"
          className="hbtn-ghost quote-adjust-button"
          disabled={duplicating}
          onClick={adjustQuote}
        >
          {duplicating ? (
            <Loader2 size={17} className="quote-action-spinner" aria-hidden />
          ) : (
            <FilePenLine size={17} strokeWidth={1.75} aria-hidden />
          )}
          {doc.replacementQuoteId ? t("openAdjustedQuote") : t("adjustQuote")}
        </button>
        {error && <div className="quote-action-error" role="alert">{error}</div>}
      </div>

      {preview && (
        <div className="quote-convert-overlay" role="presentation">
          <button
            type="button"
            className="quote-convert-backdrop"
            aria-label={t("conversionCancel")}
            onClick={() => !converting && setPreview(null)}
          />
          <div className="quote-convert-dialog" role="dialog" aria-modal="true">
            <button
              type="button"
              className="quote-convert-close"
              aria-label={t("conversionCancel")}
              disabled={converting}
              onClick={() => setPreview(null)}
            >
              <X size={18} aria-hidden />
            </button>
            <span className="quote-convert-icon"><ReceiptText size={24} aria-hidden /></span>
            <h2>{t("conversionTitle")}</h2>
            <p>{t("conversionBody")}</p>
            <div className="quote-convert-comparison">
              <span><small>{t("quote")}</small><b>{formatMoney(preview.quoteTotal)}</b></span>
              <span aria-hidden>→</span>
              <span><small>{t("invoice")}</small><b>{formatMoney(preview.invoiceTotal)}</b></span>
            </div>
            {preview.quoteTotal !== preview.invoiceTotal && (
              <div className="quote-tax-change" role="status">
                <AlertTriangle size={17} aria-hidden />
                {t("conversionTaxChanged")}
              </div>
            )}
            {preview.isExpired && (
              <div className="quote-expired-confirm" role="alert">
                <AlertTriangle size={18} aria-hidden />
                {t("conversionExpiredWarning")}
              </div>
            )}
            {error && <div className="quote-action-error" role="alert">{error}</div>}
            <div className="quote-convert-buttons">
              <button type="button" disabled={converting} onClick={() => setPreview(null)}>
                {t("conversionCancel")}
              </button>
              <button type="button" className="primary" disabled={converting} onClick={confirmConversion}>
                {converting ? t("converting") : t("conversionConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
