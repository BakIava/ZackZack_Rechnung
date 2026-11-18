"use client";

import { useId } from "react";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatAmount, formatMoney } from "@/lib/format";
import { anzeigeName } from "@/lib/katalog/anzeige";
import { istStundenEinheit } from "@/lib/documents/nachweis-positionen";
import type { KatalogEintrag } from "@/types/service";
import type { NachweisMitarbeiter, NachweisSatzZuordnung } from "@/types/nachweis";
import "./nachweis-workers.css";

const NONE = "__none";
const MIXED = "__mixed";

interface NachweisWorkersProps {
  locale: Locale;
  mitarbeiter: NachweisMitarbeiter[];
  zuordnung: NachweisSatzZuordnung;
  services: KatalogEintrag[];
  onRate: (workerKey: string, serviceId: string | null) => void;
  onRateForAll: (serviceId: string | null) => void;
}

/** Mitarbeiter mit gelesenen Stunden; je Mitarbeiter ein Stundensatz aus dem Katalog. */
export function NachweisWorkers({
  locale,
  mitarbeiter,
  zuordnung,
  services,
  onRate,
  onRateForAll,
}: NachweisWorkersProps) {
  const t = useTranslations("Step2");
  const allId = useId();
  // Stundensätze zuerst, danach alle übrigen Katalogeinträge.
  const options = [...services].sort(
    (a, b) => Number(istStundenEinheit(b.einheit)) - Number(istStundenEinheit(a.einheit)),
  );
  const values = mitarbeiter.map((entry) => zuordnung[entry.key] ?? NONE);
  const allValue = values.every((value) => value === values[0]) ? values[0] ?? NONE : MIXED;

  const optionList = (
    <>
      {options.map((service) => (
        <option key={service.id} value={service.id}>
          {`${anzeigeName(service, locale)} · ${formatMoney(service.preisCents)}/${service.einheit}`}
        </option>
      ))}
      <option value={NONE}>{t("nachweisNoCatalog")}</option>
    </>
  );
  const toServiceId = (value: string) => (value === NONE ? null : value);

  return (
    <section className="nachweis-workers" aria-labelledby={`${allId}-title`}>
      <div className="nachweis-workers-head">
        <h3 id={`${allId}-title`} className="nachweis-workers-title">{t("nachweisWorkersTitle")}</h3>
        {mitarbeiter.length > 1 && (
          <label className="nachweis-workers-all" htmlFor={allId}>
            <span>{t("nachweisRateForAll")}</span>
            <select
              id={allId}
              className="nachweis-workers-select"
              value={allValue}
              onChange={(event) => onRateForAll(toServiceId(event.target.value))}
            >
              {allValue === MIXED && <option value={MIXED} disabled>{t("nachweisRateMixed")}</option>}
              {optionList}
            </select>
          </label>
        )}
      </div>

      <ul className="nachweis-workers-list">
        {mitarbeiter.map((entry, index) => (
          <li key={entry.key} className="nachweis-worker">
            <span className="nachweis-worker-name">
              <bdi>{entry.name || t("nachweisWorkerUnnamed", { number: index + 1 })}</bdi>
              {entry.unsicher && (
                <span className="nachweis-worker-unsure" title={t("nachweisUncertain")}>
                  <CircleHelp size={14} strokeWidth={2} aria-hidden />
                  {t("nachweisUncertain")}
                </span>
              )}
            </span>
            <span className="nachweis-worker-hours">
              {t("nachweisHours", { hours: formatAmount(entry.stunden) })}
            </span>
            <select
              className="nachweis-workers-select"
              aria-label={t("nachweisRateFor", { name: entry.name || String(index + 1) })}
              value={zuordnung[entry.key] ?? NONE}
              disabled={entry.stunden <= 0}
              onChange={(event) => onRate(entry.key, toServiceId(event.target.value))}
            >
              {optionList}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
