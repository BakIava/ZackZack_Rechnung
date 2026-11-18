"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import { eurosToCents, roundHalfAwayFromZero } from "@/lib/money";
import type { NachweisKorrekturen, NachweisVorschlag } from "@/types/nachweis";
import "./nachweis-result-lines.css";

interface NachweisResultLinesProps {
  vorschlaege: NachweisVorschlag[];
  korrekturen: NachweisKorrekturen;
  onAmount: (key: string, amount: number) => void;
  onPrice: (key: string, cents: number) => void;
  onToggle: (key: string) => void;
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Abgeleitete Positionen: deutscher Dokumenttext, Menge änderbar, Preis aus Katalog oder Eingabe. */
export function NachweisResultLines({
  vorschlaege,
  korrekturen,
  onAmount,
  onPrice,
  onToggle,
}: NachweisResultLinesProps) {
  const t = useTranslations("Step2");

  return (
    <section className="nachweis-lines">
      <h3 className="nachweis-lines-title">
        <FileText size={16} strokeWidth={2} aria-hidden />
        {t("nachweisLinesTitle")}
      </h3>
      <ul className="nachweis-lines-list">
        {vorschlaege.map((vorschlag) => {
          const included = !korrekturen.excluded.includes(vorschlag.key);
          const amount = korrekturen.amounts[vorschlag.key] ?? vorschlag.amount;
          const fixedPrice = vorschlag.serviceId ? vorschlag.unitPrice : null;
          const price = fixedPrice ?? korrekturen.prices[vorschlag.key] ?? null;
          const missingPrice = included && (price === null || price <= 0);
          const sum = price !== null && amount > 0 ? roundHalfAwayFromZero(price * amount) : null;

          return (
            <li key={vorschlag.key} className="nachweis-line" data-off={included ? "0" : "1"}>
              <input
                type="checkbox"
                className="nachweis-line-check"
                checked={included}
                aria-label={t("nachweisInclude", { name: vorschlag.descriptionDe })}
                onChange={() => onToggle(vorschlag.key)}
              />
              <div className="nachweis-line-text">
                <span className="nachweis-line-desc" lang="de" dir="ltr">
                  {vorschlag.descriptionDe}
                </span>
                {vorschlag.quelle === "material" && (
                  <span className="nachweis-line-badge">{t("nachweisMaterial")}</span>
                )}
                {vorschlag.additionalDescriptionDe && (
                  <span className="nachweis-line-extra" lang="de" dir="ltr">
                    {vorschlag.additionalDescriptionDe}
                  </span>
                )}
              </div>

              <label className="nachweis-line-field">
                <span className="nachweis-line-lbl">{t("quantity")}</span>
                <span className="nachweis-line-affix" dir="ltr">
                  <input
                    // Neu aufbauen, wenn sich die Gruppierung (und damit die Ausgangsmenge) ändert.
                    key={`${vorschlag.key}:${vorschlag.amount}`}
                    className="nachweis-line-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.25"
                    defaultValue={amount}
                    disabled={!included}
                    onChange={(event) => onAmount(vorschlag.key, parseNumber(event.target.value))}
                  />
                  <span className="nachweis-line-unit">{vorschlag.unit}</span>
                </span>
              </label>

              <label className="nachweis-line-field">
                <span className="nachweis-line-lbl">{t("unitPrice")}</span>
                {fixedPrice !== null ? (
                  <span className="nachweis-line-price" dir="ltr">{formatMoney(fixedPrice)}</span>
                ) : (
                  <span className="nachweis-line-affix" dir="ltr" data-missing={missingPrice ? "1" : "0"}>
                    <input
                      className="nachweis-line-input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      defaultValue={price !== null ? price / 100 : ""}
                      disabled={!included}
                      onChange={(event) =>
                        onPrice(vorschlag.key, eurosToCents(Math.max(0, parseNumber(event.target.value))))
                      }
                    />
                    <span className="nachweis-line-unit">€</span>
                  </span>
                )}
              </label>

              <span className="nachweis-line-sum" dir={missingPrice ? undefined : "ltr"}>
                {missingPrice ? t("nachweisPriceMissing") : sum !== null ? formatMoney(sum) : "–"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
