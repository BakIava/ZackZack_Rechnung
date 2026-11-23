"use client";

import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { applyDraftTexts, checkDraftTexts } from "@/lib/documents/text-improve-actions";
import type { DocumentTotals, DraftItem } from "@/types/document";
import type {
  TextPruefungResult,
  TextUebernahme,
  TextUebernahmeError,
  TextUebernahmeResult,
} from "@/types/text-improve";
import { TextCheckDialog } from "./text-check-dialog";

interface TextCheckProps {
  documentId: string;
  items: DraftItem[];
  dir: "ltr" | "rtl";
  disabled: boolean;
  onApplied: (result: { items: DraftItem[]; totals: DocumentTotals }) => void;
  /** Ersetzbar für Tests; standardmäßig die Server-Actions. */
  checkAction?: typeof checkDraftTexts;
  applyAction?: typeof applyDraftTexts;
}

/**
 * „Texte prüfen“: alle freien Positionen in einem KI-Aufruf prüfen und die
 * gewünschten Vorschläge gemeinsam übernehmen. Ohne freie Position kein Knopf.
 */
export function TextCheck({
  documentId,
  items,
  dir,
  disabled,
  onApplied,
  checkAction = checkDraftTexts,
  applyAction = applyDraftTexts,
}: TextCheckProps) {
  const t = useTranslations("TextImprove");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<TextPruefungResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<TextUebernahmeError | null>(null);
  const lauf = useRef(0);

  if (!items.some((item) => item.serviceId === null)) return null;

  async function pruefen() {
    const id = ++lauf.current;
    setOpen(true);
    setResult(null);
    setApplyError(null);
    let next: TextPruefungResult;
    try {
      next = await checkAction(documentId);
    } catch {
      next = { status: "fehler" };
    }
    if (id === lauf.current) setResult(next);
  }

  function schliessen() {
    if (applying) return;
    lauf.current += 1;
    setOpen(false);
    setResult(null);
  }

  async function uebernehmen(aenderungen: TextUebernahme[]) {
    setApplying(true);
    setApplyError(null);
    let antwort: TextUebernahmeResult;
    try {
      antwort = await applyAction(documentId, aenderungen);
    } catch {
      antwort = { error: "textsSaveFailed" };
    }
    setApplying(false);
    if ("error" in antwort) {
      setApplyError(antwort.error);
      return;
    }
    onApplied(antwort);
    lauf.current += 1;
    setOpen(false);
    setResult(null);
  }

  return (
    <>
      <Button type="button" variant="outline" disabled={disabled || open} onClick={() => void pruefen()}>
        <Sparkles aria-hidden /> {t("checkAll")}
      </Button>
      {open && (
        <TextCheckDialog
          dir={dir}
          result={result}
          applying={applying}
          applyError={applyError}
          onClose={schliessen}
          onApply={(aenderungen) => void uebernehmen(aenderungen)}
        />
      )}
    </>
  );
}
