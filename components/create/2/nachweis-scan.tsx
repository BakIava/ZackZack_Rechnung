"use client";

import { useTranslations } from "next-intl";
import { AiIntakeLoading } from "@/components/shared/ai-intake/ai-intake-loading";
import type { NachweisImportLine } from "@/types/nachweis";
import { NachweisReview } from "./nachweis-review";
import { NachweisUpload } from "./nachweis-upload";
import { useNachweisScan } from "./use-nachweis-scan";

/**
 * Takt passend zur echten Lesedauer (~10–20 s). Der letzte Schritt bleibt
 * aktiv, bis das Ergebnis da ist – es steht nie alles auf grün, solange gewartet wird.
 */
const READING_STEP_DONE_AT_MS = [1000, 8000, 13000, null] as const;
const READING_SLOW_AFTER_MS = 25_000;

interface NachweisScanProps {
  documentId: string;
  /** Trennt den Browser-Speicher je Firma. */
  cacheScope: string;
  onImport: (lines: NachweisImportLine[]) => void;
  onManual: () => void;
}

/** Reiter „Nachweis“: Foto/PDF hochladen → lesen lassen → prüfen → Positionen übernehmen. */
export function NachweisScan({ documentId, cacheScope, onImport, onManual }: NachweisScanProps) {
  const t = useTranslations("Step2");
  const scan = useNachweisScan(documentId, cacheScope);

  if (scan.phase === "reading") {
    return (
      <AiIntakeLoading
        title={t("nachweisReadingTitle")}
        subtitle={t("nachweisReadingSub")}
        steps={[t("nachweisStep1"), t("nachweisStep2"), t("nachweisStep3"), t("nachweisStep4")]}
        stepDoneAtMs={READING_STEP_DONE_AT_MS}
        slow={{ afterMs: READING_SLOW_AFTER_MS, subtitle: t("nachweisReadingSlow") }}
      />
    );
  }

  if (scan.phase === "review" && scan.ergebnis) {
    return <NachweisReview ergebnis={scan.ergebnis} scan={scan} onImport={onImport} />;
  }

  return (
    <NachweisUpload
      error={scan.error}
      zuletzt={scan.zuletzt}
      onFile={(file) => void scan.read(file)}
      onOpen={scan.oeffnen}
      onManual={onManual}
    />
  );
}
