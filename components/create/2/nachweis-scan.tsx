"use client";

import { useTranslations } from "next-intl";
import { AiIntakeLoading } from "@/components/shared/ai-intake/ai-intake-loading";
import type { findNachweisUsage, readNachweis } from "@/lib/documents/nachweis-actions";
import { freieNachweisBereitschaft } from "@/lib/documents/nachweis-frei";
import { nachweisZeitraumText } from "@/lib/documents/nachweis-positionen";
import type { NachweisImportAntwort, NachweisImportLine } from "@/types/nachweis";
import { NachweisFreierReview } from "./nachweis-freier-review";
import { NachweisTabellenReview } from "./nachweis-tabellen-review";
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
  onImport: (lines: NachweisImportLine[]) => Promise<NachweisImportAntwort>;
  onManual: () => void;
  readAction?: typeof readNachweis;
  findUsageAction?: typeof findNachweisUsage;
}

/** Reiter „Nachweis“: Foto/PDF hochladen → lesen lassen → prüfen → Positionen übernehmen. */
export function NachweisScan({ documentId, cacheScope, onImport, onManual, readAction, findUsageAction }: NachweisScanProps) {
  const t = useTranslations("Step2");
  const scan = useNachweisScan(documentId, cacheScope, readAction, findUsageAction);

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

  if (scan.phase === "review" && scan.review) {
    const { review } = scan;
    const frei = review.variante === "frei" ? freieNachweisBereitschaft(review.ergebnis.nummer, review.zeilen) : null;
    const importDaten = frei ?? scan.importZeilen;
    return (
      <NachweisReview
        nummer={review.ergebnis.nummer}
        zeitraum={review.variante === "tabelle"
          ? nachweisZeitraumText(review.ergebnis.zeitraumVon, review.ergebnis.zeitraumBis) : undefined}
        verwendungen={scan.verwendungen}
        ausSpeicher={scan.ausSpeicher}
        onReread={scan.neuLesen}
        onReset={scan.reset}
        vollstaendig={importDaten.vollstaendig}
        onImport={async () => {
          const result = await onImport(importDaten.lines);
          if (result === "success") scan.mitarbeiterFuerNaechstesMalMerken();
          return result;
        }}
      >
        {review.variante === "frei" && frei
          ? <NachweisFreierReview review={review} scan={scan} bereitschaft={frei} />
          : review.variante === "tabelle" && <NachweisTabellenReview ergebnis={review.ergebnis} scan={scan} />}
      </NachweisReview>
    );
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
