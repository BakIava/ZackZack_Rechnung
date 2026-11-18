"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { eurosToCents } from "@/lib/money";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-material.css";

interface NachweisMaterialProps {
  scan: NachweisScanState;
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/** Material vom Blatt: Menge prüfen, Preis eingeben (kommt nie vom Modell). */
export function NachweisMaterial({ scan }: NachweisMaterialProps) {
  const t = useTranslations("Step2");

  return (
    <section className="nachweis-material">
      <h3 className="nachweis-material-title">{t("nachweisMaterial")}</h3>
      <ul className="nachweis-material-list">
        {scan.material.map((zeile) => (
          <li key={zeile.key} className="nachweis-material-row">
            <span className="nachweis-material-name" lang="de" dir="ltr">{zeile.bezeichnung}</span>
            <span className="nachweis-material-field" dir="ltr">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                defaultValue={zeile.anzahl}
                aria-label={`${t("quantity")} ${zeile.bezeichnung}`}
                onChange={(event) =>
                  scan.updateMaterial(zeile.key, { anzahl: parseNumber(event.target.value) })
                }
              />
              <span>{zeile.einheit}</span>
            </span>
            <span
              className="nachweis-material-field"
              dir="ltr"
              data-missing={zeile.unitPrice ? "0" : "1"}
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0,00"
                aria-label={`${t("unitPrice")} ${zeile.bezeichnung}`}
                onChange={(event) => {
                  const cents = eurosToCents(parseNumber(event.target.value));
                  scan.updateMaterial(zeile.key, { unitPrice: cents > 0 ? cents : null });
                }}
              />
              <span>€</span>
            </span>
            <button
              type="button"
              className="nachweis-material-remove"
              aria-label={t("nachweisRemove", { name: zeile.bezeichnung })}
              onClick={() => scan.removeMaterial(zeile.key)}
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
