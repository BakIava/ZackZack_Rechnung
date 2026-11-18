"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { AiIntakeLoading } from "@/components/shared/ai-intake/ai-intake-loading";
import type { KatalogEintrag } from "@/types/service";
import type { NachweisImportLine } from "@/types/nachweis";
import { NachweisReview } from "./nachweis-review";
import { NachweisUpload } from "./nachweis-upload";
import { useNachweisScan } from "./use-nachweis-scan";

interface NachweisScanProps {
  documentId: string;
  locale: Locale;
  services: KatalogEintrag[];
  onImport: (lines: NachweisImportLine[]) => void;
  onManual: () => void;
}

/** Reiter „Nachweis“: Foto/PDF hochladen → lesen lassen → prüfen → Positionen übernehmen. */
export function NachweisScan({ documentId, locale, services, onImport, onManual }: NachweisScanProps) {
  const t = useTranslations("Step2");
  const scan = useNachweisScan({ documentId, services });

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
    return (
      <NachweisReview
        locale={locale}
        services={services}
        ergebnis={scan.ergebnis}
        scan={scan}
        onImport={onImport}
      />
    );
  }

  return <NachweisUpload error={scan.error} onFile={(file) => void scan.read(file)} onManual={onManual} />;
}
