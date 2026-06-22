import { getTranslations } from "next-intl/server";
import "./CreatePlaceholder.css";

interface CreatePlaceholderProps {
  /** Aktueller Schritt (2 oder 3) – Schritt 1 ist als KundeStep umgesetzt. */
  step: number;
}

/** Platzhalter-Hauptbereich für die noch nicht umgesetzten Flow-Schritte.
 *  Behält die Flow-Chrome (App-Shell) bei, damit der Wechsel konsistent wirkt. */
export async function CreatePlaceholder({ step }: CreatePlaceholderProps) {
  const t = await getTranslations("Create");
  const tPlaceholder = await getTranslations("Placeholder");
  const stepKey = step === 2 ? "step2" : "step3";

  return (
    <main className="dmain">
      <div className="dscroll">
        <div className="dflow-head">
          <div>
            <div className="dflow-title">{t("title")}</div>
            <div className="dflow-sub">{t(stepKey)}</div>
          </div>
        </div>
        <p className="dflow-placeholder">{tPlaceholder("comingSoon")}</p>
      </div>
    </main>
  );
}
