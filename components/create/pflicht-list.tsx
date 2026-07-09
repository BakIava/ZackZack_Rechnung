"use client";

import { Check, Pencil, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  PflichtCheck,
  PflichtFeld,
  PflichtLocation,
} from "@/lib/legal/dokument-pflicht";

interface PflichtListProps {
  checks: PflichtCheck[];
  documentId: string;
}

const STROKE = 1.75;

const FELD_LABEL_KEY: Record<PflichtFeld, string> = {
  companyName: "pfCompanyName",
  companyAddress: "pfCompanyAddress",
  companySteuer: "pfCompanySteuer",
  customerName: "pfCustomerName",
  customerAddress: "pfCustomerAddress",
  issueDate: "pfIssueDate",
  positions: "pfPositions",
};

const LOCATION_LABEL_KEY: Record<PflichtLocation, string> = {
  settings: "fixInSettings",
  customer: "fixAtCustomer",
  positions: "fixAtPositions",
};

function fixHref(location: PflichtLocation, documentId: string): string {
  switch (location) {
    case "settings":
      return "/settings";
    case "customer":
      // ?fix=customer signalisiert Schritt 1, einen Hinweis auf den
      // „Kunde bearbeiten"-Button anzuzeigen.
      return `/create/${documentId}/1?fix=customer`;
    case "positions":
      return `/create/${documentId}/2`;
  }
}

/**
 * Pflichtangaben-Ampel für die Finalisierung. Zeigt alle §14-Checks; jeder
 * offene (rote) Punkt bekommt einen Korrigieren-Link genau an die Stelle, an
 * der er ergänzt wird (Einstellungen / Kunde / Positionen).
 */
export function PflichtList({ checks, documentId }: PflichtListProps) {
  const t = useTranslations("Create");
  const badCount = checks.filter((c) => !c.ok).length;
  const allOk = badCount === 0;

  return (
    <>
      <div className="check-head">
        <span className={`check-badge ${allOk ? "ok" : "bad"}`}>
          {allOk ? (
            <ShieldCheck size={20} strokeWidth={STROKE} aria-hidden />
          ) : (
            <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
          )}
        </span>
        <div>
          <div className="check-head-t">{t("checkTitle")}</div>
          <div className={`check-head-s ${allOk ? "ok" : "bad"}`}>
            {allOk ? t("checkAllGood") : `${badCount} × ${t("checkSome")}`}
          </div>
        </div>
      </div>
      <div className="check-list">
        {checks.map((c) => (
          <div key={c.feld} className={`check-row${c.ok ? "" : " bad"}`}>
            <span className={`check-tick ${c.ok ? "ok" : "bad"}`}>
              {c.ok ? (
                <Check size={14} strokeWidth={2.5} color="#fff" aria-hidden />
              ) : (
                <X size={14} strokeWidth={2.5} color="#fff" aria-hidden />
              )}
            </span>
            <span className="check-lbl">{t(FELD_LABEL_KEY[c.feld])}</span>
            {!c.ok && (
              <Link href={fixHref(c.location, documentId)} className="check-fix">
                <Pencil size={13} strokeWidth={STROKE} aria-hidden />
                {t(LOCATION_LABEL_KEY[c.location])}
              </Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
