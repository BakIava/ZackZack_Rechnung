"use client";

import { useTranslations } from "next-intl";
import { AiIntakeLoading } from "@/components/shared/ai-intake/ai-intake-loading";
import type { NachweisImportLine } from "@/types/nachweis";
import { NachweisReview } from "./nachweis-review";
import { NachweisUpload } from "./nachweis-upload";
import { useNachweisScan } from "./use-nachweis-scan";

interface NachweisScanProps {
  documentId: string;
  onImport: (lines: NachweisImportLine[]) => void;
  onManual: () => void;
}

/** Reiter „Nachweis“: Foto/PDF hochladen → lesen lassen → prüfen → Positionen übernehmen. */
export function NachweisScan({ documentId, onImport, onManual }: NachweisScanProps) {
  const t = useTranslations("Step2");
  const scan = useNachweisScan(documentId);

  if (scan.phase === "reading") {
    return (
      <AiIntakeLoading
        title={t("nachweisReadingTitle")}
        subtitle={t("nachweisReadingSub")}
        steps={[t("nachweisStep1"), t("nachweisStep2"), t("nachweisStep3"), t("nachweisStep4")]}
      />
    );
  }

  if (scan.phase === "review" && scan.ergebnis) {
    return <NachweisReview ergebnis={scan.ergebnis} scan={scan} onImport={onImport} />;
  }

  return <NachweisUpload error={scan.error} onFile={(file) => void scan.read(file)} onManual={onManual} />;
}
