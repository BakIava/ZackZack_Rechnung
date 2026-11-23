"use client";

import { ChevronDown, Trash2 } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { UnitPicker } from "@/components/shared/unit-picker";
import { istNachweisEinzelpreis, MAX_NACHWEIS_DESCRIPTION, parseNachweisMenge } from "@/lib/documents/nachweis-import";
import { FLOW_UNITS, withCurrentUnit } from "@/lib/documents/units";
import { formatAmount, formatMoney } from "@/lib/format";
import { eurosToCents } from "@/lib/money";
import type { NachweisFreieZeile as FreieZeile } from "@/types/nachweis";
import { NachweisFreieZahl } from "./nachweis-freie-zahl";
import "./nachweis-freie-zeile.css";

type ZeilenPatch = Partial<Omit<FreieZeile, "key" | "tage" | "unsicher">>;

interface NachweisFreieFelderProps {
  zeile: FreieZeile;
  erkannteEinheit: string | null;
  onChange: (patch: ZeilenPatch) => void;
}

function NachweisFreieFelder({ zeile, erkannteEinheit, onChange }: NachweisFreieFelderProps) {
  const t = useTranslations("Step2");
  const id = useId();
  const mengeUngueltig = parseNachweisMenge(zeile.amount) === null ||
    (zeile.unit?.trim().toLowerCase() === "pauschale" && zeile.amount !== 1);
  const einheiten = withCurrentUnit(withCurrentUnit(FLOW_UNITS, erkannteEinheit), zeile.unit);

  return (
    <div className="nachweis-freie-zeile-editor">
      <label className="nachweis-freie-zeile-field">
        {t("nachweisTextLabel")}
        <textarea
          lang="de" dir="ltr" rows={2} maxLength={MAX_NACHWEIS_DESCRIPTION}
          value={zeile.descriptionDe}
          aria-invalid={!zeile.descriptionDe.trim() || undefined}
          onChange={(event) => onChange({ descriptionDe: event.target.value })}
        />
      </label>
      <div className="nachweis-freie-zeile-values">
        <div className="nachweis-freie-zeile-field">
          <label htmlFor={`${id}-qty`}>{t("quantity")}</label>
          <NachweisFreieZahl id={`${id}-qty`} wert={zeile.amount}
            invalid={mengeUngueltig} onChange={(amount) => onChange({ amount })} />
        </div>
        <div className="nachweis-freie-zeile-field">
          <label htmlFor={`${id}-unit`}>{t("unitLbl")}</label>
          <UnitPicker
            id={`${id}-unit`}
            units={einheiten}
            value={zeile.unit ?? ""}
            placeholder={t("nachweisChooseUnit")}
            invalid={!zeile.unit?.trim()}
            searchPlaceholder={t("searchUnit")}
            noResultsLabel={t("noUnitResults")}
            onChange={(unit) => onChange({ unit })}
          />
        </div>
        <div className="nachweis-freie-zeile-field">
          <label htmlFor={`${id}-price`}>{t("nachweisNetUnitPrice")}</label>
          <NachweisFreieZahl id={`${id}-price`} wert={zeile.unitPrice === null ? null : zeile.unitPrice / 100}
            invalid={!istNachweisEinzelpreis(zeile.unitPrice)}
            onChange={(betrag) => onChange({ unitPrice: betrag === null ? null : eurosToCents(betrag) })} />
        </div>
      </div>
      {zeile.unsicher.length > 0 && (
        <p className="nachweis-freie-zeile-check">
          {zeile.unsicher.map((flag) => t(`nachweisUncertain_${flag}`)).join(", ")}
        </p>
      )}
    </div>
  );
}

interface NachweisFreieZeileProps extends NachweisFreieFelderProps {
  offen: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

export function NachweisFreieZeile({
  zeile, erkannteEinheit, offen, onToggle, onChange, onRemove,
}: NachweisFreieZeileProps) {
  const t = useTranslations("Step2");
  const detailsId = useId();
  const bezeichnung = zeile.descriptionDe.trim();
  const art = t(zeile.art === "material" ? "nachweisMaterial" : zeile.art === "anfahrt" ? "nachweisTravel" : "nachweisWork");
  const menge = parseNachweisMenge(zeile.amount);
  const einheit = zeile.unit?.trim();
  const preis = istNachweisEinzelpreis(zeile.unitPrice) ? zeile.unitPrice : null;
  const mengenText = menge !== null && einheit ? `${formatAmount(menge)} ${einheit}` : null;

  return (
    <div className="nachweis-freie-zeile" data-expanded={offen} data-testid="freie-zeile">
      <div className="nachweis-freie-zeile-head">
        <button type="button" className="nachweis-freie-zeile-toggle" aria-expanded={offen}
          aria-controls={detailsId} onClick={onToggle} data-testid="freie-zeile-toggle">
          <span className="nachweis-freie-zeile-summary">
            <span className="nachweis-freie-zeile-name" lang={bezeichnung ? "de" : undefined} dir={bezeichnung ? "ltr" : undefined}>
              {bezeichnung || art}
            </span>
            <span className="nachweis-freie-zeile-meta">
              {mengenText && <bdi dir="ltr">{mengenText}{preis !== null && ` × ${formatMoney(preis)}`}</bdi>}
              {preis === null
                ? <span>{t("nachweisPriceMissing")}</span>
                : !mengenText && <span>{t("nachweisAmountMissing")}</span>}
            </span>
          </span>
          <ChevronDown size={20} aria-hidden />
        </button>
        <button type="button" className="nachweis-freie-zeile-remove" onClick={onRemove} aria-label={t("nachweisRemoveWork")}>
          <Trash2 size={18} aria-hidden />
        </button>
      </div>
      <div id={detailsId} hidden={!offen}>
        {offen && <NachweisFreieFelder zeile={zeile} erkannteEinheit={erkannteEinheit} onChange={onChange} />}
      </div>
    </div>
  );
}
