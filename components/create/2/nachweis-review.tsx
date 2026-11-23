"use client";

import { Check, History, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { NachweisImportAntwort, NachweisVerwendung } from "@/types/nachweis";
import "./nachweis-review.css";

const STROKE = 1.9;

interface NachweisUsedBannerProps {
  nummer: string;
  verwendungen: NachweisVerwendung[];
}

function NachweisUsedBanner({ nummer, verwendungen }: NachweisUsedBannerProps) {
  const t = useTranslations("Step2");
  if (verwendungen.length === 0) return null;
  const documents = verwendungen
    .map((verwendung) => verwendung.sameDocument
      ? t("nachweisUsedHere")
      : `${t(verwendung.docType)} ${verwendung.documentNumber ?? t("nachweisUsedDraft")}`)
    .join(", ");

  return (
    <div className="nachweis-check" role="alert">
      <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
      <span>{t("nachweisAlreadyUsed", { number: nummer, documents })}</span>
    </div>
  );
}

interface NachweisReviewProps {
  nummer: string;
  zeitraum?: string;
  verwendungen: NachweisVerwendung[];
  ausSpeicher: boolean;
  vollstaendig: boolean;
  onReread: () => void;
  onReset: () => void;
  onImport: () => Promise<NachweisImportAntwort>;
  children: ReactNode;
}

export function NachweisReview({
  nummer, zeitraum, verwendungen, ausSpeicher, vollstaendig, onReread, onReset, onImport, children,
}: NachweisReviewProps) {
  const t = useTranslations("Step2");
  const [status, setStatus] = useState<NachweisImportAntwort | "idle" | "pending">("idle");
  const inArbeit = useRef(false);
  const aktiv = useRef(false);

  useEffect(() => {
    aktiv.current = true;
    return () => { aktiv.current = false; };
  }, []);

  async function importieren() {
    if (!vollstaendig || inArbeit.current || status === "unknown" || status === "success") return;
    inArbeit.current = true;
    setStatus("pending");
    let antwort: NachweisImportAntwort;
    try {
      antwort = await onImport();
    } catch {
      antwort = "unknown";
    }
    if (!aktiv.current) return;
    inArbeit.current = antwort === "success";
    setStatus(antwort);
  }

  const pending = status === "pending";
  return (
    <div className="nachweis-review" aria-busy={pending || undefined}>
      <div className="nachweis-review-head">
        <span className="nachweis-review-number">
          {nummer ? t("nachweisNumber", { number: nummer }) : t("nachweisNoNumber")}
        </span>
        {zeitraum && <span className="nachweis-review-meta" dir="ltr">{zeitraum}</span>}
      </div>
      {ausSpeicher && (
        <div className="nachweis-review-cached">
          <History size={17} strokeWidth={STROKE} aria-hidden />
          <span>{t("nachweisFromCache")}</span>
          <button type="button" className="nachweis-review-reread" onClick={onReread} disabled={pending}>
            <RefreshCw size={16} strokeWidth={STROKE} aria-hidden />
            {t("nachweisReread")}
          </button>
        </div>
      )}
      <NachweisUsedBanner nummer={nummer} verwendungen={verwendungen} />
      <fieldset className="nachweis-review-content" disabled={pending}>{children}</fieldset>
      {(status === "error" || status === "unknown") && (
        <div className="nachweis-check" role="alert">
          <TriangleAlert size={20} aria-hidden />
          <span>{t(status === "error" ? "nachweisImportFailed" : "nachweisImportUnknown")}</span>
        </div>
      )}
      <div className="nachweis-review-foot">
        <button type="button" className="nachweis-review-again" onClick={onReset} disabled={pending}>
          <RotateCcw size={17} strokeWidth={STROKE} aria-hidden />
          {t("nachweisOtherFile")}
        </button>
        <button type="button" className="nachweis-review-import"
          disabled={!vollstaendig || pending || status === "unknown" || status === "success"}
          onClick={() => void importieren()}
        >
          <Check size={20} strokeWidth={2.4} aria-hidden />
          {t(pending ? "nachweisImportPending" : "nachweisImport")}
        </button>
      </div>
    </div>
  );
}
