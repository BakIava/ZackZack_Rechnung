"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";
import type { CompanySettings } from "@/types/company";
import { savePaymentDays, saveTaxSettings } from "@/lib/settings/actions";
import type { TaxRate } from "@/types/database";
import "./settings-rechnung.css";

const STROKE = 1.75;
const ZIEL_OPTIONS = ["7", "14", "21", "30"] as const;
const TAX_RATE_OPTIONS = [19, 7, 0] as const satisfies readonly TaxRate[];

interface SaveBarProps {
  onSave: () => Promise<{ error?: string } | void>;
}

function SaveBar({ onSave }: SaveBarProps) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await onSave();
      if (result?.error) {
        setError(t.has(result.error) ? t(result.error) : t("saveError"));
        return;
      }
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="set-card-f" style={{ flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {saved && (
          <span className="set-saved">
            <Check size={16} strokeWidth={2.5} aria-hidden />
            {t("saved")}
          </span>
        )}
        <button className="set-save" onClick={handleSave} disabled={pending}>
          <Check size={17} strokeWidth={2.5} aria-hidden />
          {pending ? t("saving") : t("save")}
        </button>
      </div>
      {error && <span className="set-error">{error}</span>}
    </div>
  );
}

interface SettingsRechnungProps {
  company: CompanySettings;
  currentInvoiceNumber: string | null;
}

export function SettingsRechnung({ company, currentInvoiceNumber }: SettingsRechnungProps) {
  const t = useTranslations("Settings");
  const [klein, setKlein] = useState(company.kleinunternehmer);
  const [defaultTaxRate, setDefaultTaxRate] = useState<TaxRate>(company.default_tax_rate);
  const [ziel, setZiel] = useState(String(company.payment_days));

  return (
    <>
      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div className="set-card-t">{t("c19")}</div>
          </div>
        </div>
        <div className="set-card-b">
          <div className="set-togglerow">
            <div className="set-togglerow-txt">
              <div className="set-togglerow-t">{t("t19")}</div>
              <div className="set-togglerow-s">{t("s19")}</div>
            </div>
            <button
              className="set-switch"
              data-on={klein ? "1" : "0"}
              aria-pressed={klein}
              onClick={() => setKlein((v) => !v)}
            >
              <i />
            </button>
          </div>
          <div className="set-f-row">
            <label className="set-f-lbl" htmlFor="default-tax-rate">
              {t("defaultTaxRate")}
            </label>
            <select
              id="default-tax-rate"
              className="set-select"
              value={klein ? 0 : defaultTaxRate}
              disabled={klein}
              aria-describedby="default-tax-rate-hint"
              onChange={(event) => setDefaultTaxRate(Number(event.target.value) as TaxRate)}
            >
              {TAX_RATE_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>{rate} %</option>
              ))}
            </select>
            <div id="default-tax-rate-hint" className="set-card-s">
              {t(klein ? "defaultTaxRateKleinHint" : "defaultTaxRateHint")}
            </div>
          </div>
        </div>
        <SaveBar
          onSave={() => saveTaxSettings({
            kleinunternehmer: klein,
            defaultTaxRate: klein ? 0 : defaultTaxRate,
          })}
        />
      </section>

      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div className="set-card-t">{t("cZiel")}</div>
          </div>
        </div>
        <div className="set-card-b">
          <div className="set-f-row">
            <label className="set-f-lbl">{t("lZiel")}</label>
            <select className="set-select" value={ziel} onChange={(e) => setZiel(e.target.value)}>
              {ZIEL_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} {t("tage")}</option>
              ))}
            </select>
          </div>
          <div className="set-card-s" style={{ marginTop: -4 }}>{t("zielHint")}</div>
        </div>
        <SaveBar onSave={() => savePaymentDays(Number(ziel))} />
      </section>

      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div>
              <div className="set-card-t">{t("cNummer")}</div>
              <div className="set-card-s">{t("nrHint")}</div>
            </div>
          </div>
        </div>
        <div className="set-card-b">
          <div className="set-locked">
            <span className="set-locked-ic">
              <Lock size={19} strokeWidth={STROKE} aria-hidden />
            </span>
            <div className="set-locked-txt">
              <div className="set-locked-k">{t("lAktNr")}</div>
              <div className="set-locked-v">{currentInvoiceNumber ?? t("keineRechnung")}</div>
            </div>
            <span className="set-locked-tag">
              <Lock size={12} strokeWidth={2.5} aria-hidden />
              {t("locked")}
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
