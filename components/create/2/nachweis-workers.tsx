"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { eurosToCents } from "@/lib/money";
import type { NachweisZeile } from "@/types/nachweis";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-workers.css";

const STROKE = 2;

interface NachweisWorkersProps {
  scan: NachweisScanState;
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/**
 * Mitarbeiter wie auf dem Blatt: Name, Stunden, Stundenpreis – alles direkt änderbar.
 * Der erste eingetippte Preis gilt für alle Zeilen, die noch nicht selbst geändert wurden.
 */
export function NachweisWorkers({ scan }: NachweisWorkersProps) {
  const t = useTranslations("Step2");
  const label = (zeile: NachweisZeile, index: number) => zeile.name || String(index + 1);

  return (
    <section className="nachweis-workers">
      <div className="nachweis-workers-cols" aria-hidden>
        <span>{t("nachweisColName")}</span>
        <span>{t("nachweisColHours")}</span>
        <span>{t("nachweisColPrice")}</span>
      </div>

      <ul className="nachweis-workers-list">
        {scan.zeilen.map((zeile, index) => (
          <li key={zeile.key} className="nachweis-worker">
            <input
              className="nachweis-worker-name"
              defaultValue={zeile.name}
              placeholder={t("nachweisColName")}
              aria-label={t("nachweisColName")}
              onChange={(event) => scan.updateZeile(zeile.key, { name: event.target.value })}
            />
            <input
              className="nachweis-worker-hours"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              dir="ltr"
              defaultValue={zeile.stunden || ""}
              data-unsure={zeile.unsicher ? "1" : "0"}
              title={zeile.unsicher ? t("nachweisUncertain") : undefined}
              aria-label={t("nachweisHoursFor", { name: label(zeile, index) })}
              onChange={(event) =>
                scan.updateZeile(zeile.key, { stunden: parseNumber(event.target.value) })
              }
            />
            <span
              className="nachweis-worker-price"
              dir="ltr"
              data-missing={zeile.stunden > 0 && !zeile.preis ? "1" : "0"}
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={zeile.preis ? zeile.preis / 100 : ""}
                aria-label={t("nachweisPriceFor", { name: label(zeile, index) })}
                onChange={(event) => {
                  const cents = eurosToCents(parseNumber(event.target.value));
                  scan.setPreis(zeile.key, cents > 0 ? cents : null);
                }}
              />
              <span>€</span>
            </span>
            <button
              type="button"
              className="nachweis-worker-remove"
              aria-label={t("nachweisRemove", { name: label(zeile, index) })}
              onClick={() => scan.removeZeile(zeile.key)}
            >
              <X size={18} strokeWidth={STROKE} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="nachweis-workers-add" onClick={scan.addZeile}>
        <Plus size={18} strokeWidth={STROKE} aria-hidden />
        {t("nachweisAddWorker")}
      </button>
    </section>
  );
}
