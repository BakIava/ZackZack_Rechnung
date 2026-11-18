"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";
import { anzeigeName } from "@/lib/katalog/anzeige";
import { eurosToCents } from "@/lib/money";
import { nachweisSatzOptionen } from "@/lib/documents/nachweis-positionen";
import type { KatalogEintrag } from "@/types/service";
import type { NachweisZeile } from "@/types/nachweis";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-workers.css";

const STROKE = 2;
const OWN = "__own";

interface NachweisWorkersProps {
  locale: Locale;
  services: KatalogEintrag[];
  scan: NachweisScanState;
}

function parseNumber(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

/** Mitarbeiter wie auf dem Blatt: Name, Stunden, Stundensatz – alles direkt änderbar. */
export function NachweisWorkers({ locale, services, scan }: NachweisWorkersProps) {
  const t = useTranslations("Step2");
  const options = nachweisSatzOptionen(services);
  const brauchtEigenenPreis = scan.zeilen.some(
    (zeile) => zeile.stunden > 0 && !options.some((option) => option.id === zeile.serviceId),
  );
  const label = (zeile: NachweisZeile, index: number) => zeile.name || String(index + 1);

  return (
    <section className="nachweis-workers">
      <div className="nachweis-workers-cols" aria-hidden>
        <span>{t("nachweisColName")}</span>
        <span>{t("nachweisColHours")}</span>
        <span>{t("nachweisColRate")}</span>
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
            <select
              className="nachweis-worker-rate"
              value={zeile.serviceId ?? OWN}
              aria-label={t("nachweisRateFor", { name: label(zeile, index) })}
              onChange={(event) =>
                scan.updateZeile(zeile.key, {
                  serviceId: event.target.value === OWN ? null : event.target.value,
                })
              }
            >
              {options.map((service) => (
                <option key={service.id} value={service.id}>
                  {`${anzeigeName(service, locale)} · ${formatMoney(service.preisCents)}`}
                </option>
              ))}
              <option value={OWN}>{t("nachweisOwnRate")}</option>
            </select>
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

      {brauchtEigenenPreis && (
        <label className="nachweis-workers-own" data-missing={scan.eigenerPreis ? "0" : "1"}>
          <span>{t("nachweisOwnRateLabel")}</span>
          <span className="nachweis-workers-own-field" dir="ltr">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              defaultValue={scan.eigenerPreis ? scan.eigenerPreis / 100 : ""}
              onChange={(event) => {
                const cents = eurosToCents(parseNumber(event.target.value));
                scan.setEigenerPreis(cents > 0 ? cents : null);
              }}
            />
            <span>€</span>
          </span>
        </label>
      )}
    </section>
  );
}
