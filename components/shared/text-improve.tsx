"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { istTextImproveLaenge } from "@/lib/documents/text-improve";
import { improveText } from "@/lib/documents/text-improve-actions";
import type { TextImproveFeld, TextImproveResult } from "@/types/text-improve";
import "./text-improve.css";

interface TextImproveProps {
  /** Aktueller Feldinhalt; ein Ergebnis gilt nur, solange er unverändert ist. */
  value: string;
  feld: TextImproveFeld;
  onAccept: (text: string) => void;
  /** Abstand o. Ä. aus der CSS-Datei der einbettenden Komponente. */
  className?: string;
  /** Ersetzbar für Tests; standardmäßig die Server-Action. */
  action?: typeof improveText;
}

type Zustand =
  | { status: "idle" }
  | { status: "loading"; fuer: string }
  | (TextImproveResult & { fuer: string });

const STROKE = 2;

/**
 * Knopf „Text verbessern“ unter einem deutschen Dokumentfeld. Claude schlägt
 * nur vor; übernommen wird erst auf Tippen. Ändert sich der Feldinhalt, gilt
 * ein angezeigtes Ergebnis als veraltet und verschwindet.
 */
export function TextImprove({ value, feld, onAccept, className, action = improveText }: TextImproveProps) {
  const t = useTranslations("TextImprove");
  const [zustand, setZustand] = useState<Zustand>({ status: "idle" });
  const anfrage = useRef(0);
  const root = (base: string) => (className ? `${base} ${className}` : base);

  const aktuell = zustand.status !== "idle" && zustand.fuer === value ? zustand : null;
  const loading = aktuell?.status === "loading";

  async function verbessern() {
    const text = value;
    const id = ++anfrage.current;
    setZustand({ status: "loading", fuer: text });
    let result: TextImproveResult;
    try {
      result = await action(text, feld);
    } catch {
      result = { status: "fehler" };
    }
    if (id === anfrage.current) setZustand({ ...result, fuer: text });
  }

  function schliessen() {
    anfrage.current += 1;
    setZustand({ status: "idle" });
  }

  if (aktuell?.status === "vorschlag") {
    return (
      <div className={root("text-improve-card")} role="status">
        <span className="text-improve-label">
          <Sparkles size={14} strokeWidth={STROKE} aria-hidden />
          {t("suggestion")}
        </span>
        <p className="text-improve-text" dir="ltr" lang="de">{aktuell.text}</p>
        <div className="text-improve-actions">
          <button
            type="button"
            className="text-improve-accept"
            onClick={() => {
              onAccept(aktuell.text);
              schliessen();
            }}
          >
            <Check size={17} strokeWidth={2.4} aria-hidden />
            {t("accept")}
          </button>
          <button type="button" className="text-improve-keep" onClick={schliessen}>
            {t("keep")}
          </button>
        </div>
      </div>
    );
  }

  const hinweis = aktuell ? hinweisVon(aktuell) : null;
  if (hinweis) {
    return (
      <div className={root("text-improve-notice")} role="status" data-tone={hinweis.tone}>
        <span>{t(hinweis.key, { limit: hinweis.limit })}</span>
        <button type="button" className="text-improve-close" onClick={schliessen} aria-label={t("close")}>
          <X size={16} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={root("text-improve-trigger")}
      disabled={loading || !istTextImproveLaenge(value, feld)}
      aria-busy={loading || undefined}
      onClick={() => void verbessern()}
    >
      {loading
        ? <Loader2 size={17} strokeWidth={STROKE} className="text-improve-spin" aria-hidden />
        : <Sparkles size={17} strokeWidth={STROKE} aria-hidden />}
      {loading ? t("loading") : t("improve")}
    </button>
  );
}

interface Hinweis {
  key: "unchanged" | "notGerman" | "limit" | "failed";
  tone: "ok" | "warn";
  limit: number;
}

/** Ergebnis ohne Vorschlag → Hinweistext (Schlüssel im Namespace TextImprove). */
function hinweisVon(result: Exclude<Zustand, { status: "idle" }>): Hinweis | null {
  switch (result.status) {
    case "unveraendert":
      return { key: "unchanged", tone: "ok", limit: 0 };
    case "kein_deutsch":
      return { key: "notGerman", tone: "warn", limit: 0 };
    case "limit":
      return { key: "limit", tone: "warn", limit: result.dailyLimit };
    case "fehler":
      return { key: "failed", tone: "warn", limit: 0 };
    default:
      return null;
  }
}
