"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAmount } from "@/lib/format";
import "./nachweis-stunden-hinweis.css";

interface NachweisStundenHinweisProps {
  blatt: number | null;
  stunden: number;
}

export function NachweisStundenHinweis({ blatt, stunden }: NachweisStundenHinweisProps) {
  const t = useTranslations("Step2");
  if (blatt === null || Math.abs(stunden - blatt) < 0.001) return null;

  return (
    <div className="nachweis-stunden-hinweis" role="status">
      <TriangleAlert size={20} strokeWidth={1.9} aria-hidden />
      <span>{t("nachweisCheckMismatch", {
        hours: formatAmount(stunden), sheet: formatAmount(blatt),
      })}</span>
    </div>
  );
}
